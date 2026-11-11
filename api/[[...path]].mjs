import { createClient } from "@supabase/supabase-js";

const SKINS = {
  market: { id: "market", n: "17", light: "lamp", owner: "Isha" },
  clinic: { id: "clinic", n: "9", light: "stock", owner: "Sen" },
  dock: { id: "dock", n: "4", light: "seal", owner: "Oka" },
  bay: { id: "bay", n: "2", light: "light", owner: "Nova" },
};
const XP = [20, 20, 25, 20, 25, 20, 40];
const WORDS = ["PATH", "GET", "PATCH", "404", "JSON", "POST", "REST"];
const PLAYER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function skinOf(id) {
  return SKINS[id] ?? null;
}

function view(row) {
  const words = Array.isArray(row.words) ? row.words.filter((word) => WORDS.includes(word)) : [];
  return {
    skin: skinOf(row.skin) ? row.skin : "",
    cleared: row.cleared,
    xp: row.xp,
    words,
    theme: row.theme === "light" ? "light" : "dark",
  };
}

async function ensure(db, id) {
  const found = await db.from("helix_players").select("*").eq("id", id).maybeSingle();
  if (found.error) throw found.error;
  if (found.data) return found.data;
  const inserted = await db.from("helix_players").insert({ id }).select("*").single();
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function cardsOf(db, player, skin) {
  const { data, error } = await db
    .from("helix_cards")
    .select("card_id, owner, light_on, pos")
    .eq("player_id", player)
    .eq("skin", skin)
    .order("pos");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.card_id, owner: row.owner, on: row.light_on === true }));
}

async function one(db, player, skin, id) {
  const { data, error } = await db
    .from("helix_cards")
    .select("card_id, owner, light_on")
    .eq("player_id", player)
    .eq("skin", skin)
    .eq("card_id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.card_id, owner: data.owner, on: data.light_on === true } : null;
}

async function seed(db, player, skin, empty) {
  const removed = await db.from("helix_cards").delete().eq("player_id", player).eq("skin", skin.id);
  if (removed.error) throw removed.error;
  if (empty) return;
  const inserted = await db.from("helix_cards").insert([
    { player_id: player, skin: skin.id, card_id: "03", owner: "Rin", light_on: false, pos: 0 },
    { player_id: player, skin: skin.id, card_id: skin.n, owner: skin.owner, light_on: true, pos: 1 },
    { player_id: player, skin: skin.id, card_id: "21", owner: "Sol", light_on: true, pos: 2 },
  ]);
  if (inserted.error) throw inserted.error;
}

function shelfResult(status, stamp, shelf, inbox) {
  return { status, body: { stamp, shelf, inbox } };
}

async function play(db, row, method, target, jam, body) {
  const skin = skinOf(row.skin);
  if (!skin) return shelfResult(409, "", [], []);
  const shelf = () => cardsOf(db, row.id, skin.id);
  if (jam) return shelfResult(500, "500", await shelf(), []);
  if (method === "GET" && !target) {
    const cards = await shelf();
    return shelfResult(200, "200", cards, cards);
  }
  if (method === "GET" && (target === "99" || target === "new")) return shelfResult(404, "404", await shelf(), []);
  if (method === "POST" && !target) {
    const existing = await one(db, row.id, skin.id, "8");
    if (!existing) {
      const max = await db.from("helix_cards").select("pos").eq("player_id", row.id).eq("skin", skin.id).order("pos", { ascending: false }).limit(1);
      if (max.error) throw max.error;
      const pos = (max.data?.[0]?.pos ?? -1) + 1;
      const inserted = await db.from("helix_cards").insert({
        player_id: row.id,
        skin: skin.id,
        card_id: "8",
        owner: skin.owner,
        light_on: true,
        pos,
      });
      if (inserted.error) throw inserted.error;
    }
    const saved = await one(db, row.id, skin.id, "8");
    return shelfResult(201, "201", await shelf(), [saved]);
  }
  if (method === "POST") return shelfResult(400, "", await shelf(), []);
  const card = await one(db, row.id, skin.id, target);
  if (!card) return shelfResult(404, "404", await shelf(), []);
  if (method === "GET") return shelfResult(200, "200", await shelf(), [{ ...card }]);
  if (method === "PUT") {
    if (!body || body.owner !== "" || body.on !== false) return shelfResult(400, "", await shelf(), []);
    const updated = await db.from("helix_cards").update({ owner: "", light_on: false }).eq("player_id", row.id).eq("skin", skin.id).eq("card_id", card.id);
    if (updated.error) throw updated.error;
    return shelfResult(200, "200", await shelf(), [{ id: card.id, owner: "", on: false }]);
  }
  if (method === "PATCH") {
    if (!body || body[skin.light] !== false) return shelfResult(400, "", await shelf(), []);
    const updated = await db.from("helix_cards").update({ light_on: false }).eq("player_id", row.id).eq("skin", skin.id).eq("card_id", card.id);
    if (updated.error) throw updated.error;
    return shelfResult(200, "200", await shelf(), [{ ...card, on: false }]);
  }
  return shelfResult(400, "", await shelf(), []);
}

function send(res, status, body) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Player, X-Jam");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  if (status === 204) {
    res.status(204).end();
    return;
  }
  res.status(status).json(body);
}

async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return {};
  if (req.body && typeof req.body === "object") return req.body;
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 20_000) reject(new Error("big"));
      else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      send(res, 204, {});
      return;
    }
    const parts = [].concat(req.query.path ?? []).filter(Boolean);
    const path = "/api" + (parts.length ? `/${parts.join("/")}` : "");

    if (req.method === "GET" && path === "/api/health") {
      send(res, 200, { ok: true, db: "supabase" });
      return;
    }

    const id = typeof req.headers["x-player"] === "string" && PLAYER.test(req.headers["x-player"]) ? req.headers["x-player"] : "";
    if (!id) {
      send(res, 401, { error: "player" });
      return;
    }

    const db = sb();
    const row = await ensure(db, id);
    let body = {};
    try {
      body = await readBody(req);
    } catch {
      send(res, 400, { error: "json" });
      return;
    }

    if (req.method === "GET" && path === "/api/player") {
      send(res, 200, view(row));
      return;
    }

    if (req.method === "PATCH" && path === "/api/player") {
      const theme = body.theme === "light" ? "light" : "dark";
      const updated = await db.from("helix_players").update({ theme, updated_at: new Date().toISOString() }).eq("id", id);
      if (updated.error) throw updated.error;
      send(res, 200, view(await ensure(db, id)));
      return;
    }

    if (req.method === "POST" && path === "/api/player/migrate") {
      const current = view(row);
      if (current.skin || current.cleared || current.xp) {
        send(res, 200, current);
        return;
      }
      const cleared = Math.max(0, Math.min(WORDS.length, Number(body.cleared) || 0));
      const skin = skinOf(body.skin)?.id ?? "";
      const theme = body.theme === "light" ? "light" : "dark";
      const xp = XP.slice(0, cleared).reduce((sum, value) => sum + value, 0);
      const updated = await db
        .from("helix_players")
        .update({
          skin,
          cleared,
          xp,
          words: WORDS.slice(0, cleared),
          theme,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updated.error) throw updated.error;
      if (skin) await seed(db, id, skinOf(skin), false);
      send(res, 200, view(await ensure(db, id)));
      return;
    }

    if (req.method === "POST" && path === "/api/city") {
      const skin = body.skin === "" ? "" : skinOf(body.skin)?.id;
      if (skin === undefined) {
        send(res, 400, { error: "skin" });
        return;
      }
      const updated = await db
        .from("helix_players")
        .update({ skin, cleared: 0, xp: 0, words: [], updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updated.error) throw updated.error;
      const cards = await db.from("helix_cards").delete().eq("player_id", id);
      if (cards.error) throw cards.error;
      const clears = await db.from("helix_clears").delete().eq("player_id", id);
      if (clears.error) throw clears.error;
      if (skin) await seed(db, id, skinOf(skin), false);
      send(res, 200, view(await ensure(db, id)));
      return;
    }

    if (req.method === "POST" && path === "/api/clears") {
      const index = Number(body.index);
      const current = await ensure(db, id);
      if (!Number.isInteger(index) || index < 0 || index >= WORDS.length || index !== current.cleared) {
        send(res, 409, { ...view(current), awarded: false });
        return;
      }
      const words = view(current).words;
      if (!words.includes(WORDS[index])) words.push(WORDS[index]);
      const updated = await db
        .from("helix_players")
        .update({
          cleared: index + 1,
          xp: current.xp + XP[index],
          words,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updated.error) throw updated.error;
      const logged = await db.from("helix_clears").insert({ player_id: id, level_index: index, xp: XP[index] });
      if (logged.error) throw logged.error;
      send(res, 200, { ...view(await ensure(db, id)), awarded: true });
      return;
    }

    if (path === "/api/shelves/reset" && req.method === "POST") {
      const skin = skinOf(row.skin);
      if (!skin) {
        send(res, 409, { stamp: "", shelf: [], inbox: [] });
        return;
      }
      await seed(db, id, skin, body.empty === true);
      send(res, 200, { stamp: "", shelf: await cardsOf(db, id, skin.id), inbox: [] });
      return;
    }

    if (path === "/api/shelves" || path.startsWith("/api/shelves/")) {
      const target = path === "/api/shelves" ? "" : decodeURIComponent(path.slice("/api/shelves/".length));
      if (target === "reset" || (target && !/^[0-9a-z]{1,8}$/.test(target))) {
        send(res, 404, { stamp: "404", shelf: [], inbox: [] });
        return;
      }
      const jam = req.headers["x-jam"] === "1";
      const result = await play(db, await ensure(db, id), req.method, target, jam, body);
      send(res, result.status, result.body);
      return;
    }

    send(res, 404, { error: "missing" });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) send(res, 500, { error: "server" });
  }
}
