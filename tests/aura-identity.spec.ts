import { expect, test } from "@playwright/test";

import { customersForIdentity, normalizeAuraEmail, normalizeAuraPhone } from "../lib/aura/identity";

test("Aura normalizes US numbers without turning New York 347 into Spain", () => {
  expect(normalizeAuraPhone("347-567-5077")).toBe("+13475675077");
  expect(normalizeAuraPhone("1 (347) 567-5077")).toBe("+13475675077");
  expect(normalizeAuraPhone("+1 347 567 5077")).toBe("+13475675077");
  expect(normalizeAuraPhone("+3475675077")).toBe("+13475675077");
  expect(normalizeAuraPhone("3475675")).toBeNull();
  expect(normalizeAuraPhone("3475675077")).not.toBe("+3475675077");
});

test("Aura resolves exactly one customer using normalized phone or email", () => {
  const customers = [
    { id: "one", full_name: "Known Customer", company_name: null, phone: "(347) 567-5077", email: "KNOWN@EXAMPLE.COM" },
    { id: "two", full_name: "Other Customer", company_name: null, phone: "516-555-0100", email: "other@example.com" },
  ];
  expect(customersForIdentity(customers, "+13475675077", null).map((customer) => customer.id)).toEqual(["one"]);
  expect(customersForIdentity(customers, null, " known@example.com ").map((customer) => customer.id)).toEqual(["one"]);
  expect(normalizeAuraEmail(" KNOWN@EXAMPLE.COM ")).toBe("known@example.com");
});

test("Aura exposes duplicate identity matches as a conflict", () => {
  const customers = [
    { id: "one", full_name: "One", company_name: null, phone: "3475675077", email: "one@example.com" },
    { id: "two", full_name: "Two", company_name: null, phone: "+1 347 567 5077", email: "two@example.com" },
  ];
  expect(customersForIdentity(customers, "3475675077", null)).toHaveLength(2);
});
