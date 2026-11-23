import { test } from "node:test";
import assert from "node:assert/strict";
import { MENU } from "../data.js";
import {
  normalizeCart,
  cartTotals,
  latestOrder,
  safeHistory,
  mergeCart,
} from "../cart.js";
test("null and non-cart values are empty", () => {
  for (const input of [null, undefined, 42, "bad", true])
    assert.deepEqual(normalizeCart(input, MENU), []);
});
test("legacy object carts migrate", () =>
  assert.deepEqual(cartTotals({ 1: "2", 6: 3 }, MENU), {
    count: 5,
    total: 445,
  }));
test("deleted products do not count", () =>
  assert.deepEqual(cartTotals([{ id: 999, q: 5 }], MENU), {
    count: 0,
    total: 0,
  }));
test("negative and zero quantities are dropped", () =>
  assert.equal(
    normalizeCart(
      [
        { id: 1, q: -3 },
        { id: 1, q: 0 },
      ],
      MENU,
    ).length,
    0,
  ));
test("positive fractions round down; sub-unit quantities disappear", () =>
  assert.deepEqual(
    normalizeCart(
      [
        { id: 1, q: 0.5 },
        { id: 1, q: 2.9 },
      ],
      MENU,
    ).map((l) => l.q),
    [2],
  ));
test("huge quantities are clamped without bitwise overflow", () =>
  assert.equal(normalizeCart([{ id: 1, q: 2147483648 }], MENU)[0].q, 50));
test("numeric strings become numbers", () =>
  assert.deepEqual(
    cartTotals(
      [
        { id: "1", q: "2" },
        { id: 6, q: "3" },
      ],
      MENU,
    ),
    { count: 5, total: 445 },
  ));
test("NaN, infinite, boolean and object quantities disappear", () => {
  for (const q of [NaN, Infinity, "Infinity", true, {}, [], null, ""])
    assert.equal(normalizeCart([{ id: 1, q }], MENU).length, 0);
});
test("notes are bounded and non-drink options removed", () => {
  const [line] = normalizeCart(
    [{ id: 1, q: 1, note: "x".repeat(100), opt: 1 }],
    MENU,
  );
  assert.equal(line.note.length, 80);
  assert.equal(line.opt, -1);
});
test("drink options validated", () => {
  assert.equal(normalizeCart([{ id: 17, q: 1, opt: 2 }], MENU)[0].opt, 2);
  for (const opt of [null, "", 99, -2, 0.5])
    assert.equal(normalizeCart([{ id: 17, q: 1, opt }], MENU)[0].opt, -1);
});
test("malformed histories cannot crash", () => {
  for (const input of [null, {}, 42, [null, {}, "x", { lines: null }]])
    assert.equal(latestOrder(input, MENU), null);
  assert.deepEqual(safeHistory(null), []);
});
test("latest valid saved draft is selected and normalized", () => {
  const last = latestOrder(
    [{ lines: [{ id: 1, q: "2" }] }, { lines: [{ id: 999, q: 3 }] }],
    MENU,
  );
  assert.deepEqual(cartTotals(last.lines, MENU), { count: 2, total: 190 });
});
test("reorder merges only matching notes and drinks", () => {
  const lines = mergeCart(
    [{ id: 17, q: 48, opt: 1, note: "a" }],
    [
      { id: 17, q: 9, opt: 1, note: "a" },
      { id: 17, q: 2, opt: 2, note: "a" },
    ],
    MENU,
  );
  assert.deepEqual(
    lines.map((l) => l.q),
    [50, 2],
  );
});
test("prices use the preserved catalog", () =>
  assert.equal(
    cartTotals(
      [
        { id: 1, q: 2 },
        { id: 6, q: 1 },
        { id: 18, q: 3 },
      ],
      MENU,
    ).total,
    320,
  ));
