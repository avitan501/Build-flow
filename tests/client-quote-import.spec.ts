import { expect, test } from "@playwright/test";

import {
  clientQuoteUnitPrice,
  findRequestScopedClientQuoteAttachment,
  matchRequestClientQuoteItems,
} from "@/lib/client-quote-import";

test("matches extracted client quote rows uniquely while allowing partial prices", () => {
  const result = matchRequestClientQuoteItems([
    { description: "NEW 4\" METER INLET CONTROL VALVE (OS&Y)", unitPrice: 1_100 },
    { description: "4 in Meter outlet control valve OS&Y", unitPrice: 950 },
    { description: "NEPTUNE MACH 10 WATER METER", specification: "4 inch, model 53107-100", unitPrice: 6_000 },
    { description: "Delivery charge", unitPrice: null, lineTotal: 500 },
  ], [
    { id: "inlet", description: "Meter inlet control valve", specification: "4 in · OS&Y" },
    { id: "outlet", description: "Meter outlet control valve", specification: "4 in · OS&Y" },
    { id: "meter", description: "Neptune MACH 10 water meter", specification: "4 in · Model 53107-100" },
    { id: "strainer", description: "Neptune strainer", specification: "4 in · Model 53107-100" },
  ]);

  expect(result.matches.map((match) => [match.sourceIndex, match.comparisonItemId, match.clientUnitPrice])).toEqual([
    [0, "inlet", 1_100],
    [1, "outlet", 950],
    [2, "meter", 6_000],
  ]);
  expect(result.unmatchedSourceIndexes).toEqual([3]);
});

test("does not assign two extracted rows to the same comparison line", () => {
  const result = matchRequestClientQuoteItems([
    { description: "5/8 in regular Sheetrock", unitPrice: 18 },
    { description: "5/8 regular drywall Sheetrock", unitPrice: 17.5 },
  ], [
    { id: "drywall", description: "5/8 in regular Sheetrock" },
  ]);

  expect(result.matches).toHaveLength(1);
  expect(result.matches[0]).toMatchObject({ sourceIndex: 0, comparisonItemId: "drywall", clientUnitPrice: 18 });
  expect(result.unmatchedSourceIndexes).toEqual([1]);
});

test("derives a unit price only when quantity and line total are safe", () => {
  expect(clientQuoteUnitPrice({ description: "Plywood", quantity: 20, unitPrice: null, lineTotal: 720 })).toBe(36);
  expect(clientQuoteUnitPrice({ description: "Plywood", quantity: 0, unitPrice: null, lineTotal: 720 })).toBeNull();
  expect(clientQuoteUnitPrice({ description: "Plywood", quantity: 20, unitPrice: null, lineTotal: -1 })).toBeNull();
});

test("a client quote attachment cannot cross request, owner, or project boundaries", () => {
  const attachments = [
    { id: "quote-a", request_id: "request-a", owner_id: "client-a", project_id: "project-a", file_name: "a.pdf" },
    { id: "quote-b", request_id: "request-b", owner_id: "client-b", project_id: "project-b", file_name: "b.pdf" },
  ];

  expect(findRequestScopedClientQuoteAttachment(attachments, {
    attachmentId: "quote-a",
    requestId: "request-a",
    ownerId: "client-a",
    projectId: "project-a",
  })?.file_name).toBe("a.pdf");
  expect(findRequestScopedClientQuoteAttachment(attachments, { attachmentId: "quote-a", requestId: "request-b" })).toBeNull();
  expect(findRequestScopedClientQuoteAttachment(attachments, { attachmentId: "quote-a", requestId: "request-a", ownerId: "client-b" })).toBeNull();
  expect(findRequestScopedClientQuoteAttachment(attachments, { attachmentId: "quote-a", requestId: "request-a", projectId: "project-b" })).toBeNull();
});
