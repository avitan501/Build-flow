import "server-only";

export function locateCheapItemEnabled() {
  return process.env.LOCATE_CHEAP_ITEM_ENABLED === "true";
}
