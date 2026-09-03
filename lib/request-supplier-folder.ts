export type SupplierFolderComparison = {
  id: string;
  bids: Array<{ supplierId: string; [key: string]: unknown }>;
  documents: Array<{ supplierId: string | null; [key: string]: unknown }>;
  [key: string]: unknown;
};

export function requestSupplierFolderContents<T extends SupplierFolderComparison>(
  comparisons: T[],
  supplierId: string,
) {
  const exactSupplierId = supplierId.trim();
  if (!exactSupplierId) return [];

  return comparisons.flatMap((comparison) => {
    const bids = comparison.bids.filter((bid) => bid.supplierId === exactSupplierId);
    const documents = comparison.documents.filter((document) => document.supplierId === exactSupplierId);
    if (!bids.length && !documents.length) return [];
    return [{ ...comparison, bids, documents }];
  });
}
