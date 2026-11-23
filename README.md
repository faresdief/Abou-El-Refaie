# Abou-El-Refaie

Arabic/English restaurant menu and WhatsApp draft interface, built with HTML, CSS and native JavaScript modules. There is no build step and no backend.

## Demo status

This is a demo interface, not a restaurant booking system or payment service. Prices, opening hours, availability and delivery fees are catalog content, not live restaurant data. Confirm them directly with the restaurant. The page does not confirm reservations or orders. Opening WhatsApp prepares a draft for the visitor to review and send manually. It does not prove a message was sent, delivered or accepted.

Existing restaurant phone numbers, WhatsApp destination and Google Maps destinations are preserved. Automated tests intercept WhatsApp links and block all external requests. They never contact the restaurant, send orders or book tables.

## Run locally

Use Node.js 20 or later for tests, and Python 3 for the local server:

```sh
npm ci
npm start
```

Open http://localhost:8000. Native modules need an HTTP server; opening index.html with a file URL is not supported.

## Project map

- `index.html`: semantic page structure and dialogs.
- `styles.css`: responsive RTL/LTR styles.
- `data.js`: Arabic/English text, preserved catalog, contact constants and embedded images.
- `cart.js`: pure cart normalization, pricing and saved-draft helpers.
- `app.js`: menu, cart forms, validation, language switching and UI events.
- `pwa.js`: install prompt and app icon/manifest setup.
- `sw.js`: versioned offline asset cache, using network-first reads and cached offline fallback.
- `tests/cart.test.js`: cart and pricing regression tests.
- `tests/browser.spec.js`: isolated browser checks including offline reload.

## Tests

```sh
npm test
npm run check
npm run test:browser
```

Browser tests use Google Chrome at `/usr/bin/google-chrome` by default. Set `CHROME_PATH` to your Chrome/Chromium executable on another system. No live WhatsApp sends or reservations are made.

Coverage includes null/malformed carts, numeric strings, invalid and fractional quantities, integer-overflow quantities, deleted products, malformed saved history, drink options and notes, reorder, totals, language/search/category controls, validation, cart persistence after WhatsApp handoff, explicit clear, mobile layouts and offline assets.

## Storage and privacy

The browser stores cart lines, language, sound preference and up to 20 prepared order/reservation drafts in localStorage. Prepared drafts may contain the visitor's name, phone and address. They are not confirmed orders and are not sent to a backend. Do not enter sensitive details on a shared device. Clear the site's browser storage to remove all locally saved data. Storage may be unavailable or cleared by the browser; this is not account-based storage or cross-device sync.

Opening WhatsApp no longer deletes the cart. Use the explicit Clear cart control to empty it. Saved draft history is only a convenience for reordering, not proof of a completed purchase. Delivery fees are not included in the displayed merchandise subtotal and must be confirmed by the restaurant.

## Offline behavior

The service worker caches the page and all local modules together during installation. It removes only this app's older `abu-` caches. Cached content is a fallback, not current restaurant availability. External fonts can be unavailable offline; system fonts are used instead. Visitors with a very old service worker may need one additional online reload while the new worker activates.

## Deployment

Serve the repository root from GitHub Pages or any static HTTPS host. Keep the relative module paths unchanged, including deployment under a project subdirectory. The original MIT license is in `LICENSE`.
