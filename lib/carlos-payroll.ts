export type CarlosPayDay = { date:string; workedMs:number; paidAt:string|null; requestedAt:string|null; version:number }
export function payrollTotalCents(days: Pick<CarlosPayDay,"workedMs">[]) {
  return Math.round(days.reduce((sum,day)=>sum+Math.max(0,Number(day.workedMs)||0),0)*500/3_600_000)
}
export function payrollMoney(cents:number) { return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100) }
