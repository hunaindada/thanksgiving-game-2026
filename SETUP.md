# Saguaro Links: putting it on your own domain

The family games page lives in `saguaro/`. Shared live scores come from `functions/api/games.js`,
which needs a Cloudflare D1 database. Everything is free except the domain.

## One-time setup in Cloudflare

1. **Buy the domain.** Cloudflare dashboard → Domain Registration → Register Domains → `hunaindada.com`.
2. **Create the database.** Storage & Databases → D1 → Create → name it `saguaro-links`.
3. **Create the site.** Workers & Pages → Create → Pages → Connect to Git → pick
   `hunaindada/thanksgiving-game-2026`. Production branch: `main`. Framework preset: None.
   Build command: leave empty. Build output directory: `/`. Save and Deploy.
4. **Connect the database.** In the new Pages project → Settings → Bindings → Add → D1 database.
   Variable name: `DB` (exactly). Database: `saguaro-links`. Save, then Deployments → Retry deployment.
5. **Attach the domain.** Pages project → Custom domains → Set up a custom domain → `hunaindada.com`.

The page is then at `https://hunaindada.com/saguaro/`.

## Notes

- The first visit copies the scores from the Claude-hosted page (as of Nov 24, 2026) into the empty
  database. See `functions/_seed.js`.
- Anyone with the link can enter scores. There is no sign-in.
- Without the database (for example on GitHub Pages), the page still works, but scores are saved
  only on the phone that entered them.
- `hunaindada.com/` itself still shows the Family Thanksgiving Game Show page (`index.html`).
