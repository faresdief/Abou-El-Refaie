import { LOGO } from "./data.js";
export function initPWA({ $$, $, toast, t, openLayer }) {
  /* PWA install */
  const standalone = () =>
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let dip = null;
  const syncInstall = () =>
    $$("[data-install]").forEach((b) => (b.hidden = standalone()));
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    dip = e;
  });
  addEventListener("appinstalled", () => {
    dip = null;
    syncInstall();
    toast(t("installed"));
  });
  async function install() {
    if (dip) {
      const p = dip;
      dip = null;
      try {
        await p.prompt();
        await p.userChoice;
      } catch (e) {}
      return;
    }
    $("#iosA").hidden = $("#iosN").hidden = !isIOS;
    $("#iosB").hidden = isIOS;
    openLayer("ios");
  }
  function icon(n, url) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = c.height = n;
          const x = c.getContext("2d");
          x.fillStyle = "#050507";
          x.fillRect(0, 0, n, n);
          const s = n * 0.78;
          x.drawImage(im, (n - s) / 2, (n - s) / 2, s, s);
          if (url) return res(c.toDataURL("image/png"));
          c.toBlob((b) => res(b ? URL.createObjectURL(b) : LOGO), "image/png");
        } catch (e) {
          res(LOGO);
        }
      };
      im.onerror = () => res(LOGO);
      im.src = LOGO;
    });
  }
  async function setupPWA() {
    try {
      const ap = document.createElement("link");
      ap.rel = "apple-touch-icon";
      ap.href = await icon(180, true);
      document.head.append(ap);
      const fv = document.createElement("link");
      fv.rel = "icon";
      fv.href = LOGO;
      document.head.append(fv);
      if (!/^https?:$/.test(location.protocol)) return;
      const [i1, i2] = await Promise.all([icon(192), icon(512)]),
        page = location.origin + location.pathname,
        scope = new URL("./", location.href).href;
      const m = {
        name: "شاورما أبو الرفاعي",
        short_name: "أبو الرفاعي",
        description: "اطلب شاورما أبو الرفاعي من الزمالك",
        lang: "ar",
        dir: "rtl",
        start_url: page,
        scope,
        display: "standalone",
        background_color: "#050507",
        theme_color: "#7F1D1D",
        icons: [
          {
            src: i1,
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: i2,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      };
      const ml = document.createElement("link");
      ml.rel = "manifest";
      ml.href = URL.createObjectURL(
        new Blob([JSON.stringify(m)], { type: "application/manifest+json" }),
      );
      document.head.append(ml);
      if ("serviceWorker" in navigator)
        await navigator.serviceWorker.register("sw.js");
    } catch (e) {
      console.warn("PWA setup:", e);
    }
  }

  return { syncInstall, install, setupPWA };
}
