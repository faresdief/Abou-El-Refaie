import { LOGO, HERO, WA, PH, T, MENU, CATS, EMO } from "./data.js";
import {
  DRINKS,
  normalizeCart,
  cartTotals,
  latestOrder,
  mergeCart,
  safeHistory,
} from "./cart.js";
import { initPWA } from "./pwa.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => document.querySelectorAll(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};
let L = store.get("abu-lang", "ar") === "en" ? "en" : "ar",
  snd = store.get("abu-snd", true) !== false,
  cat = "all",
  term = "",
  mode = "delivery",
  draft = {},
  opener = null;
let cart = [],
  seq = 0;
const t = (k) => T[L][k],
  nm = (m) => m[L],
  fmt = (n) => new Intl.NumberFormat(L === "ar" ? "ar-EG" : "en-US").format(n),
  mi = (id) => MENU.find((m) => m.id == id);
const nrm = (s) =>
  s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652]/g, "");
const uid = () => "l" + Date.now().toString(36) + seq++,
  qty = (id) => cart.filter((l) => l.id == id).reduce((s, l) => s + l.q, 0);
cart = normalizeCart(store.get("abu-cart", []), MENU, DRINKS.length).map(
  (l) => ({ ...l, u: uid() }),
);
const saveCart = () =>
  store.set(
    "abu-cart",
    cart.map(({ id, q, note, opt }) => ({ id, q, note, opt })),
  );
const toast = (m, ms = 3600) => {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = m;
  $("#toasts").append(e);
  setTimeout(() => e.remove(), ms);
};
function fatal(err) {
  console.error(err);
  if ($(".fatal")) return;
  const d = document.createElement("div");
  d.className = "fatal s";
  d.setAttribute("role", "alert");
  d.innerHTML = `<b>${t("fatal")}</b><p style="color:var(--mu)">${t("fatal_p")} ${PH[0]}</p><button class="btn pri" type="button">${t("reload")}</button>`;
  d.querySelector("button").onclick = () => location.reload();
  document.body.append(d);
}
addEventListener("error", (e) => {
  if (e.error) fatal(e.error);
});
addEventListener("unhandledrejection", (e) => fatal(e.reason));
const safe =
  (fn) =>
  (...a) => {
    try {
      return fn(...a);
    } catch (e) {
      fatal(e);
    }
  };

/* tactile click sound (Web Audio) */
let AC = null;
function click() {
  if (!snd) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const o = AC.createOscillator(),
      g = AC.createGain(),
      n = AC.currentTime;
    o.type = "sine";
    o.frequency.setValueAtTime(1100, n);
    o.frequency.exponentialRampToValueAtTime(620, n + 0.07);
    g.gain.setValueAtTime(0.0001, n);
    g.gain.exponentialRampToValueAtTime(0.08, n + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, n + 0.09);
    o.connect(g);
    g.connect(AC.destination);
    o.start(n);
    o.stop(n + 0.1);
  } catch (e) {}
}
document.addEventListener(
  "pointerdown",
  (e) => {
    if (e.target.closest("button,a.btn,.seg label")) click();
  },
  { passive: true },
);

/* menu */
const renderMenu = safe(() => {
  $("#tabs").innerHTML = CATS.map(
    ([id]) =>
      `<button class="tab" role="tab" data-c="${id}" aria-selected="${id === cat}">${id === "all" ? t("all") : t("c_" + id)}</button>`,
  ).join("");
  const q = nrm(term.trim()),
    list = MENU.filter(
      (i) =>
        (cat === "all" || i.c === cat) &&
        (!q || nrm(i.ar + " " + i.en).includes(q)),
    );
  $("#grid").innerHTML = list.length
    ? list
        .map((i) => {
          const n = qty(i.id);
          return `<article class="card s"><div class="em" aria-hidden="true">${i.e || EMO[i.c]}</div><h3>${esc(nm(i))}</h3><div class="row"><div class="pr">${fmt(i.p)} <small>${t("cur")}</small></div>${n ? `<div class="step"><button data-a="dec" data-id="${i.id}" aria-label="${t("dec")}">−</button><span>${fmt(n)}</span><button data-a="inc" data-id="${i.id}" aria-label="${t("inc")}">+</button></div>` : `<button class="btn pri" data-a="inc" data-id="${i.id}">${t("add")}</button>`}</div></article>`;
        })
        .join("")
    : `<div class="empty s">${t("empty")}</div>`;
});

/* cart */
const sum = () => cartTotals(cart, MENU).total,
  count = () => cartTotals(cart, MENU).count,
  plain = (id) => cart.find((l) => l.id === id && !l.note && l.opt < 0);
function change(id, d) {
  id = +id;
  if (!mi(id)) return;
  if (d > 0) {
    const p = plain(id);
    if (p) p.q = Math.min(50, p.q + 1);
    else cart.push({ u: uid(), id, q: 1, note: "", opt: -1 });
    if (qty(id) === 1) toast(t("added") + ": " + nm(mi(id)));
  } else {
    const ls = cart.filter((l) => l.id === id),
      l = ls[ls.length - 1];
    if (l && --l.q <= 0) cart = cart.filter((x) => x !== l);
  }
  saveCart();
  sync();
}
function lineChange(u, d) {
  const l = cart.find((x) => x.u === u);
  if (!l) return;
  l.q = Math.min(50, l.q + d);
  if (l.q <= 0) cart = cart.filter((x) => x !== l);
  saveCart();
  sync();
}
function toggleEdit(u) {
  const l = cart.find((x) => x.u === u);
  if (!l) return;
  l.ed = !l.ed;
  renderCart();
  if (l.ed) {
    const i = document.querySelector(`[data-line="${u}"][data-f="note"]`);
    i && i.focus();
  }
}
const lastOrder = () =>
  latestOrder(store.get("abu-orders", []), MENU, DRINKS.length);
function renderAgain() {
  const o = lastOrder(),
    el = $("#again");
  if (!o) {
    el.hidden = true;
    return;
  }
  const ls = o.lines,
    tot = cartTotals(ls, MENU).total;
  el.hidden = false;
  el.innerHTML = `<div><b>${t("again_t")}</b><p>${ls.map((l) => `${esc(nm(mi(l.id)))} × ${fmt(l.q)}`).join(" · ")}</p></div><button class="btn pri" data-a="again" type="button">${t("again_b")} · ${fmt(tot)} ${t("cur")}</button>`;
}
function reorder() {
  const o = lastOrder();
  if (!o) return;
  cart = mergeCart(cart, o.lines, MENU, DRINKS.length).map((l) => ({
    ...l,
    u: uid(),
  }));
  saveCart();
  sync();
  openLayer("dr");
  toast(t("again_ok"));
}
function sync() {
  $("#cnt").textContent = fmt(count());
  renderMenu();
  renderCart();
}
const renderCart = safe(() => {
  const ids = cart,
    cur = t("cur");
  $("#cartBody").innerHTML = ids.length
    ? ids
        .map((l) => {
          const m = mi(l.id),
            dr = !!m.dk,
            tag =
              (l.opt >= 0 ? "🥤 " + DRINKS[l.opt][L] + " " : "") +
              (l.note ? "📝 " + esc(l.note) : "");
          return `<div class="it"><b>${esc(nm(m))}</b><div class="step"><button data-a="ldec" data-u="${l.u}" aria-label="${t("dec")}">−</button><span>${fmt(l.q)}</span><button data-a="linc" data-u="${l.u}" aria-label="${t("inc")}">+</button></div><small>${fmt(m.p)} × ${fmt(l.q)}</small><b style="color:var(--br);text-align:end">${fmt(m.p * l.q)} ${cur}</b>${tag ? `<small class="ln">${tag}</small>` : ""}<button class="btn sec ed" data-a="edit" data-u="${l.u}" aria-expanded="${!!l.ed}">✎ ${t("edit")}</button>${l.ed ? `<div class="ef">${dr ? `<select class="in" data-line="${l.u}" data-f="opt" aria-label="${t("drink")}"><option value="-1">${t("any")}</option>${DRINKS.map((d, i) => `<option value="${i}" ${l.opt === i ? "selected" : ""}>${d[L]}</option>`).join("")}</select>` : ""}<input class="in" data-line="${l.u}" data-f="note" maxlength="80" value="${esc(l.note)}" placeholder="${t("note_ph")}" aria-label="${t("note_i")}"></div>` : ""}</div>`;
        })
        .join("")
    : `<div class="empty">${t("cart_e")}</div>`;
  const dl = mode === "delivery";
  $("#cartFoot").innerHTML = ids.length
    ? `<form class="fm" id="ordForm" novalidate><div class="seg"><label><input type="radio" name="mode" value="delivery" ${dl ? "checked" : ""}><span>${t("m_d")}</span></label><label><input type="radio" name="mode" value="pickup" ${dl ? "" : "checked"}><span>${t("m_p")}</span></label></div>
<div class="two"><label>${t("name")}<input class="in" name="name" autocomplete="name" value="${esc(draft.name || "")}"></label><label>${t("phone")}<input class="in" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" value="${esc(draft.phone || "")}"></label></div>
<div class="fm" ${dl ? "" : "hidden"}><label>${t("area")}<select class="in" name="area">${t(
        "areas",
      )
        .map(
          (a, i) =>
            `<option value="${i}" ${draft.area == i ? "selected" : ""}>${a}</option>`,
        )
        .join(
          "",
        )}</select></label><label>${t("ad")}<input class="in" name="addr" autocomplete="street-address" value="${esc(draft.addr || "")}"></label></div>
<label>${t("note")}<input class="in" name="note" value="${esc(draft.note || "")}"></label><div class="err" id="oe" role="alert"></div>
<div class="tot"><span>${t("sum")}</span><span>${fmt(sum())} ${cur}</span></div><div class="tot"><span>${t("fee")}</span><span>${dl ? t("fee_d") : t("fee_p")}</span></div><div class="tot big"><span>${t("sum")}</span><b>${fmt(sum())} ${cur}</b></div>
<button class="btn pri" type="submit">${t("wa")}</button><button class="btn sec" type="button" data-a="clear">${t("clear")}</button></form>`
    : "";
});

/* layers */
const layers = { dr: $("#dr"), md: $("#md"), ios: $("#ios") };
function openLayer(id) {
  opener = document.activeElement;
  const e = layers[id];
  $("#ov").classList.add("on");
  e.classList.add("on");
  e.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
  setTimeout(
    () =>
      (
        e.querySelector("input,select") || e.querySelector("[data-close]")
      ).focus({ preventScroll: true }),
    80,
  );
}
function closeAll() {
  Object.values(layers).forEach((e) => {
    e.classList.remove("on");
    e.setAttribute("aria-hidden", "true");
  });
  $("#ov").classList.remove("on");
  document.body.style.overflow = "";
  opener && opener.focus && opener.focus();
}
function resForm() {
  const n = new Date(),
    iso = new Date(n.getTime() - n.getTimezoneOffset() * 6e4)
      .toISOString()
      .slice(0, 10);
  $("#resForm").innerHTML =
    `<div class="seg"><label><input type="radio" name="kind" value="table" checked><span>${t("k_t")}</span></label><label><input type="radio" name="kind" value="delivery"><span>${t("k_d")}</span></label></div>
<div class="two"><label>${t("name")}<input class="in" name="name" autocomplete="name"></label><label>${t("phone")}<input class="in" name="phone" type="tel" inputmode="tel" placeholder="01XXXXXXXXX"></label></div>
<div class="two"><label>${t("date")}<input class="in" name="date" type="date" min="${iso}" value="${iso}"></label><label>${t("time")}<input class="in" name="time" type="time"></label></div>
<label id="rg">${t("guests")}<select class="in" name="n">${[1, 2, 3, 4, 5, 6, 8, 10].map((x) => `<option value="${x}">${fmt(x)}</option>`).join("")}</select></label>
<label id="ra" hidden>${t("ad")}<input class="in" name="addr" autocomplete="street-address"></label>
<label>${t("note")}<input class="in" name="note"></label><div class="err" id="re" role="alert"></div><button class="btn pri" type="submit">${t("res_b")}</button>`;
}
const dig = (v) =>
    v.replace(/[\s-]/g, "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)),
  okPhone = (v) => /^01[0125]\d{8}$/.test(dig(v));
function check(f, rules, out) {
  f.querySelectorAll(".in").forEach((i) => i.classList.remove("bad"));
  let bad = null;
  for (const [n, k, ok] of rules) {
    const el = f.elements[n];
    if (!ok(el.value.trim())) {
      el.classList.add("bad");
      bad = bad || [el, t(k)];
    }
  }
  out.textContent = bad ? bad[1] : "";
  if (bad) bad[0].focus();
  return !bad;
}
function sendWA(text) {
  const a = document.createElement("a");
  a.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.append(a);
  a.click();
  a.remove();
}

/* events */
document.addEventListener(
  "click",
  safe((e) => {
    const b = e.target.closest(
      "[data-a],[data-c],[data-close],[data-cart],[data-res],[data-install],#ov,#lang,#snd",
    );
    if (!b) return;
    if (b.dataset.a === "inc") change(b.dataset.id, 1);
    else if (b.dataset.a === "dec") change(b.dataset.id, -1);
    else if (b.dataset.a === "linc") lineChange(b.dataset.u, 1);
    else if (b.dataset.a === "ldec") lineChange(b.dataset.u, -1);
    else if (b.dataset.a === "edit") toggleEdit(b.dataset.u);
    else if (b.dataset.a === "again") reorder();
    else if (b.dataset.a === "clear") {
      cart = [];
      saveCart();
      sync();
      toast(t("cleared"));
    } else if (b.dataset.c) {
      cat = b.dataset.c;
      renderMenu();
    } else if ("cart" in b.dataset) {
      renderCart();
      openLayer("dr");
    } else if ("res" in b.dataset) {
      resForm();
      openLayer("md");
    } else if ("install" in b.dataset) install();
    else if (b.id === "lang") {
      L = L === "ar" ? "en" : "ar";
      store.set("abu-lang", L);
      applyLang();
    } else if (b.id === "snd") {
      snd = !snd;
      store.set("abu-snd", snd);
      applyLang();
      click();
    } else closeAll();
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAll();
});
$("#q").addEventListener(
  "input",
  safe((e) => {
    term = e.target.value;
    renderMenu();
  }),
);
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.line) {
    const l = cart.find((x) => x.u === el.dataset.line);
    if (l) {
      if (el.dataset.f === "opt") l.opt = +el.value;
      else l.note = el.value.slice(0, 80);
      saveCart();
    }
    return;
  }
  const f = el.form;
  if (f && f.id === "ordForm" && el.name !== "mode") draft[el.name] = el.value;
});
document.addEventListener(
  "change",
  safe((e) => {
    const f = e.target.form;
    if (!f) return;
    if (f.id === "ordForm" && e.target.name === "mode") {
      mode = e.target.value;
      renderCart();
    }
    if (f.id === "resForm" && e.target.name === "kind") {
      const tb = e.target.value === "table";
      $("#rg").hidden = !tb;
      $("#ra").hidden = tb;
    }
  }),
);
document.addEventListener(
  "submit",
  safe((e) => {
    e.preventDefault();
    const f = e.target,
      d = Object.fromEntries(new FormData(f)),
      cur = t("cur");
    if (f.id === "ordForm") {
      const dl = mode === "delivery";
      if (
        !check(
          f,
          [
            ["name", "v_n", (v) => v.length >= 2],
            ["phone", "v_p", okPhone],
            ["addr", "v_a", (v) => !dl || v.length >= 6],
          ],
          $("#oe"),
        )
      )
        return;
      const lines = cart.flatMap((l) => [
        `• ${nm(mi(l.id))} × ${l.q} = ${mi(l.id).p * l.q} ${cur}`,
        ...(l.opt >= 0 ? [`   ${t("drink")}: ${DRINKS[l.opt][L]}`] : []),
        ...(l.note ? [`   ${t("w_nt")}: ${l.note}`] : []),
      ]);
      const msg = [
        `*${t("w_o")}* — ${t("brand")}`,
        "",
        ...lines,
        "",
        `${t("sum")}: ${sum()} ${cur} (${dl ? t("fee_d") : t("fee_p")})`,
        `${t("w_ty")}: ${dl ? t("w_dv") : t("w_pk")}`,
        `${t("name")}: ${d.name.trim()}`,
        `${t("phone")}: ${dig(d.phone)}`,
        ...(dl
          ? [
              `${t("w_ar")}: ${t("areas")[d.area | 0]}`,
              `${t("w_ad")}: ${d.addr.trim()}`,
            ]
          : []),
        ...(d.note.trim() ? [`${t("w_nt")}: ${d.note.trim()}`] : []),
      ].join("\n");
      const log = safeHistory(store.get("abu-orders", []));
      log.push({
        at: new Date().toISOString(),
        total: sum(),
        text: msg,
        lines: cart.map(({ id, q, note, opt }) => ({ id, q, note, opt })),
      });
      store.set("abu-orders", log.slice(-20));
      sendWA(msg);
      saveCart();
      closeAll();
      renderAgain();
      sync();
      toast(t("sent"), 4600);
    }
    if (f.id === "resForm") {
      const tb = d.kind === "table";
      if (
        !check(
          f,
          [
            ["name", "v_n", (v) => v.length >= 2],
            ["phone", "v_p", okPhone],
            ["date", "v_d", (v) => !!v && new Date(v + "T23:59") >= new Date()],
            ["time", "v_t", (v) => !!v],
            ["addr", "v_a", (v) => tb || v.length >= 6],
          ],
          $("#re"),
        )
      )
        return;
      const msg = [
        `*${tb ? t("w_r") : t("w_dl")}* — ${t("brand")}`,
        "",
        `${t("name")}: ${d.name.trim()}`,
        `${t("phone")}: ${dig(d.phone)}`,
        `${t("date")}: ${d.date}`,
        `${t("time")}: ${d.time}`,
        ...(tb
          ? [`${t("guests")}: ${d.n}`]
          : [`${t("w_ad")}: ${d.addr.trim()}`]),
        ...(d.note.trim() ? [`${t("w_nt")}: ${d.note.trim()}`] : []),
      ].join("\n");
      const log = safeHistory(store.get("abu-res", []));
      log.push({ at: new Date().toISOString(), text: msg });
      store.set("abu-res", log.slice(-20));
      sendWA(msg);
      closeAll();
      toast(t("res_ok"), 4600);
    }
  }),
);

/* language + boot */
function applyLang() {
  const h = document.documentElement;
  h.lang = L;
  h.dir = L === "ar" ? "rtl" : "ltr";
  h.style.setProperty("--d", L === "ar" ? -1 : 1);
  document.title = t("brand") + " | " + (L === "ar" ? "الزمالك" : "Zamalek");
  $$("[data-i]").forEach((e) => (e.textContent = t(e.dataset.i)));
  $$("[data-ph]").forEach((e) => (e.placeholder = t(e.dataset.ph)));
  $$("[data-al]").forEach((e) => e.setAttribute("aria-label", t(e.dataset.al)));
  $("#lang").textContent = t("other");
  $("#snd").textContent = snd ? "🔊" : "🔇";
  $("#snd").setAttribute("aria-label", snd ? t("on") : t("off"));
  $("#n1").textContent = fmt(MENU.length);
  $("#n2").textContent = fmt(4);
  $("#yr").textContent = new Date().getFullYear();
  $$("[data-logo]").forEach((i) => {
    i.src = LOGO;
    i.alt = i.classList.contains("bg") ? "" : t("brand");
  });
  $$("[data-hero]").forEach((i) => {
    i.src = HERO;
    i.alt =
      L === "ar"
        ? "ساندوتش شاورما سوري على طبق خشبي"
        : "Syrian shawarma wrap on a wooden plate";
  });
  $("#map").href =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("شاورما أبو الرفاعي ٢ شارع طه حسين الزمالك");
  if ($("#md").classList.contains("on")) resForm();
  renderStatus();
  renderAgain();
  sync();
}
/* live Cairo status: open 12:00 to 02:00 */
const cairoHour = () =>
  parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10,
  ) % 24;
function renderStatus() {
  const h = cairoHour(),
    o = h >= 12 || h < 2;
  $$("[data-status]").forEach((e) => {
    e.dataset.open = o;
    e.querySelector(".sl").textContent = t(o ? "so_l" : "sc_l");
    e.querySelector(".ss").textContent = t(o ? "so_s" : "sc_s");
  });
}
setInterval(renderStatus, 6e4);
const { syncInstall, install, setupPWA } = initPWA({
  $$,
  $,
  toast,
  t,
  openLayer,
});
syncInstall();
applyLang();
setupPWA();
