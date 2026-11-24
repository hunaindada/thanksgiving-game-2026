// Shared scores for Saguaro Links. Cloudflare Pages Function backed by a D1 database bound as "DB".
//   GET  /api/games        -> { v, games: { id: game } }   (add ?v=<last v> to get { same: true } when nothing changed)
//   PUT  /api/games?id=ID  -> saves one game (the whole game object as JSON)
import SEED from "../_seed.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function ready(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)").run();
  const n = await db.prepare("SELECT COUNT(*) AS n FROM games").first();
  if (n && n.n === 0) {
    const now = Date.now();
    const rows = Object.keys(SEED).map((id) =>
      db.prepare("INSERT OR IGNORE INTO games (id, data, updated) VALUES (?, ?, ?)").bind(id, JSON.stringify(SEED[id]), now));
    rows.push(db.prepare("INSERT OR IGNORE INTO games (id, data, updated) VALUES ('_seeded', '{}', ?)").bind(now));
    await db.batch(rows);
  }
}

async function version(db) {
  const r = await db.prepare("SELECT COALESCE(MAX(updated), 0) AS m, COUNT(*) AS n FROM games").first();
  return r.m + "." + r.n;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "no_database" }, 503);
  await ready(env.DB);
  const v = await version(env.DB);
  if (new URL(request.url).searchParams.get("v") === v) return json({ same: true, v });
  const { results } = await env.DB.prepare("SELECT id, data FROM games WHERE id != '_seeded'").all();
  const games = {};
  for (const row of results) {
    try { games[row.id] = JSON.parse(row.data); } catch (e) { /* skip a bad row */ }
  }
  return json({ v, games });
}

export async function onRequestPut({ request, env }) {
  if (!env.DB) return json({ error: "no_database" }, 503);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9-]{1,40}$/.test(id)) return json({ error: "bad_id" }, 400);
  const text = await request.text();
  if (text.length > 40000) return json({ error: "too_large" }, 400);
  let game;
  try { game = JSON.parse(text); } catch (e) { return json({ error: "bad_json" }, 400); }
  if (!game || typeof game !== "object" || !Array.isArray(game.players) || game.players.length > 12) return json({ error: "bad_game" }, 400);
  await ready(env.DB);
  const exists = await env.DB.prepare("SELECT 1 AS x FROM games WHERE id = ?").bind(id).first();
  if (!exists) {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM games").first();
    if (n.n >= 400) return json({ error: "full" }, 400);
  }
  // "updated" always moves forward, so every save changes the version the phones poll for.
  const last = await env.DB.prepare("SELECT COALESCE(MAX(updated), 0) AS m FROM games").first();
  const now = Math.max(Date.now(), last.m + 1);
  await env.DB.prepare("INSERT INTO games (id, data, updated) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated = excluded.updated")
    .bind(id, JSON.stringify(game), now).run();
  return json({ ok: true, v: await version(env.DB) });
}
