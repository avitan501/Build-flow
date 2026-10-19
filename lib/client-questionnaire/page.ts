import { randomBytes } from "node:crypto";
import questions from "./questions.json";
import styles from "./styles.css.json";
import { privateHeaders } from "./http";
export function questionnairePage(content: string, title: string) {
  const nonce = randomBytes(18).toString("base64");
  const config = JSON.stringify(questions).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style nonce="${nonce}">${styles}</style></head><body><script nonce="${nonce}">window.questionnaireConfig=${config};</script>${content.replaceAll("<script>", `<script nonce="${nonce}">`)}</body></html>`;
  return new Response(html, { headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'` } });
}
