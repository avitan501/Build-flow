export type AuraInternalKnowledgeDocument = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  content_markdown: string;
  tags: string[];
  source_refs: Array<Record<string, unknown>>;
  status: "draft" | "reviewed_internal" | "archived";
  retrieval_only: true;
  customer_send_allowed: false;
  reviewed_at: string | null;
  updated_at: string;
};

const STOP_WORDS = new Set(["a", "an", "and", "for", "in", "is", "of", "on", "or", "the", "to", "with"]);

function queryTerms(query: string) {
  return [...new Set(query.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((term) => term.length > 1 && !STOP_WORDS.has(term)))].slice(0, 20);
}

/** Internal ranking only. This helper has no messaging or send dependency. */
export function retrieveInternalAuraDocuments(
  documents: AuraInternalKnowledgeDocument[],
  query: string,
  limit = 5,
) {
  const terms = queryTerms(query);
  return documents
    .filter((document) => document.retrieval_only && !document.customer_send_allowed && document.status !== "archived")
    .map((document) => {
      const title = document.title.toLowerCase();
      const tags = document.tags.join(" ").toLowerCase();
      const body = `${document.summary} ${document.content_markdown}`.toLowerCase();
      const score = terms.length
        ? terms.reduce((total, term) => total + (title.includes(term) ? 5 : 0) + (tags.includes(term) ? 3 : 0) + (body.includes(term) ? 1 : 0), 0)
        : 1;
      return { document, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || Date.parse(right.document.updated_at) - Date.parse(left.document.updated_at))
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(({ document }) => document);
}
