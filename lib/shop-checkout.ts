export type ShopCartQuoteLineInput = {
  productId: string;
  quantity: number;
};

export const SHOP_CART_ESTIMATED_TAX_RATE = 0.085;

export function calculateShopCartTax(subtotal: number) {
  return Number((subtotal * SHOP_CART_ESTIMATED_TAX_RATE).toFixed(2));
}
