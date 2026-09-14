import { expect, test } from "@playwright/test"
import { requestDeliveryCoverage } from "@/lib/request-delivery-coverage"
const event = (ids: string[]) => ({ client_action: "delivery_scheduled", delivery_item_ids: ids })
test("partial schedule never completes whole request", () => {
  expect(requestDeliveryCoverage([event(["a"])], ["a","b"])).toMatchObject({ complete:false,scheduledCount:1,totalCount:2 })
})
test("separate schedules can cover all current products without duplicate counting", () => {
  expect(requestDeliveryCoverage([event(["a"]),event(["a","b"])], ["a","b"]).complete).toBe(true)
})
test("new products and unknown legacy scope require review", () => {
  expect(requestDeliveryCoverage([{client_action:"delivery_scheduled",delivery_scope:"all"}], ["a"]).complete).toBe(false)
  expect(requestDeliveryCoverage([event(["old"])], ["a"]).complete).toBe(false)
  expect(requestDeliveryCoverage([event(["a"])], ["a","new"]).complete).toBe(false)
  expect(requestDeliveryCoverage([], []).complete).toBe(false)
})
