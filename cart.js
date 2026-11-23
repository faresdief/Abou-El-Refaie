export const DRINKS = [
  { ar: "كوكاكولا", en: "Coca-Cola" },
  { ar: "سبرايت", en: "Sprite" },
  { ar: "فانتا", en: "Fanta" },
  { ar: "بيبسي", en: "Pepsi" },
];
const quantity = (q) => {
  if (!["number", "string"].includes(typeof q) || String(q).trim() === "")
    return 0;
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? Math.min(50, Math.floor(n)) : 0;
};
export function normalizeCart(value, menu, drinkCount = DRINKS.length) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value).map(([id, q]) => ({ id, q }))
      : [];
  const lines = [];
  for (const line of source) {
    if (!line || typeof line !== "object") continue;
    const id = Number(line.id),
      item = menu.find((m) => m.id === id),
      q = quantity(line.q);
    if (!item || !q) continue;
    const opt = Number(line.opt),
      note = typeof line.note === "string" ? line.note.slice(0, 80) : "";
    lines.push({
      id,
      q,
      note,
      opt:
        item.dk &&
        line.opt !== null &&
        line.opt !== "" &&
        Number.isInteger(opt) &&
        opt >= 0 &&
        opt < drinkCount
          ? opt
          : -1,
    });
  }
  return lines;
}
export function cartTotals(value, menu) {
  return normalizeCart(value, menu).reduce(
    (sum, line) => ({
      count: sum.count + line.q,
      total: sum.total + menu.find((m) => m.id === line.id).p * line.q,
    }),
    { count: 0, total: 0 },
  );
}
export const safeHistory = (value) =>
  Array.isArray(value)
    ? value
        .filter((o) => o && typeof o === "object" && !Array.isArray(o))
        .slice(-20)
    : [];
export function latestOrder(value, menu, drinkCount) {
  const history = safeHistory(value);
  for (let i = history.length - 1; i >= 0; i--) {
    if (!Array.isArray(history[i].lines)) continue;
    const lines = normalizeCart(history[i].lines, menu, drinkCount);
    if (lines.length) return { ...history[i], lines };
  }
  return null;
}
export function mergeCart(cart, incoming, menu, drinkCount) {
  const result = [];
  for (const line of [
    ...normalizeCart(cart, menu, drinkCount),
    ...normalizeCart(incoming, menu, drinkCount),
  ]) {
    const match = result.find(
      (x) => x.id === line.id && x.note === line.note && x.opt === line.opt,
    );
    if (match) match.q = Math.min(50, match.q + line.q);
    else result.push({ ...line });
  }
  return result;
}
