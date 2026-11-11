import { mkdirSync } from "node:fs";
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const root = dirname(fileURLToPath(import.meta.url));
const dbFile = join(root, "..", "data", "helix.sqlite");
mkdirSync(dirname(dbFile), { recursive: true });

const db = new DatabaseSync(dbFile);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    skin TEXT NOT NULL DEFAULT '',
    cleared INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    words TEXT NOT NULL DEFAULT '[]',
    theme TEXT NOT NULL DEFAULT 'dark',
    opened INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cards (
    player_id TEXT NOT NULL,
    skin TEXT NOT NULL,
    card_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    light_on INTEGER NOT NULL,
    pos INTEGER NOT NULL,
    PRIMARY KEY (player_id, skin, card_id)
  );
  CREATE TABLE IF NOT EXISTS clears (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    level_index INTEGER NOT NULL,
    xp INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
if (!db.prepare("PRAGMA table_info(players)").all().some((col) => col.name === "opened")) {
  db.exec("ALTER TABLE players ADD COLUMN opened INTEGER NOT NULL DEFAULT 0");
}
db.prepare("UPDATE players SET opened = 1 WHERE opened = 0 AND (skin != '' OR cleared > 0 OR xp > 0)").run();

const SKINS = {
  market: { id: "market", n: "17", light: "lamp", owner: "Isha" },
  clinic: { id: "clinic", n: "9", light: "stock", owner: "Sen" },
  dock: { id: "dock", n: "4", light: "seal", owner: "Oka" },
  bay: { id: "bay", n: "2", light: "light", owner: "Nova" },
};
const XP = [20, 20, 25, 20, 25, 20, 40];
const WORDS = ["PATH", "GET", "PATCH", "404", "JSON", "POST", "REST"];
const PLAYER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function skinOf(id) {
  return SKINS[id] ?? null;
}

function playerId(req) {
  const id = req.headers["x-player"];
  return typeof id === "string" && PLAYER.test(id) ? id : "";
}

function ensure(id) {
  let row = db.prepare("SELECT * FROM players WHERE id = ?").get(id);
  if (!row) {
    db.prepare("INSERT INTO players (id) VALUES (?)").run(id);
    row = db.prepare("SELECT * FROM players WHERE id = ?").get(id);
  }
  return row;
}

function view(row) {
  let words = [];
  try {
    const parsed = JSON.parse(row.words);
    if (Array.isArray(parsed)) words = parsed.filter((word) => WORDS.includes(word));
  } catch {
    words = [];
  }
  return {
    skin: skinOf(row.skin) ? row.skin : "",
    cleared: row.cleared,
    xp: row.xp,
    words,
    theme: row.theme === "light" ? "light" : "dark",
  };
}

function cardsOf(player, skin) {
  return db
    .prepare("SELECT card_id, owner, light_on FROM cards WHERE player_id = ? AND skin = ? ORDER BY pos")
    .all(player, skin)
    .map((row) => ({ id: row.card_id, owner: row.owner, on: row.light_on === 1 }));
}

function seed(player, skin, empty) {
  db.prepare("DELETE FROM cards WHERE player_id = ? AND skin = ?").run(player, skin.id);
  if (empty) return;
  const insert = db.prepare(
    "INSERT INTO cards (player_id, skin, card_id, owner, light_on, pos) VALUES (?, ?, ?, ?, ?, ?)",
  );
  insert.run(player, skin.id, "03", "Rin", 0, 0);
  insert.run(player, skin.id, skin.n, skin.owner, 1, 1);
  insert.run(player, skin.id, "21", "Sol", 1, 2);
}

function one(player, skin, id) {
  const row = db
    .prepare("SELECT card_id, owner, light_on FROM cards WHERE player_id = ? AND skin = ? AND card_id = ?")
    .get(player, skin, id);
  return row ? { id: row.card_id, owner: row.owner, on: row.light_on === 1 } : null;
}

function send(res, status, body) {
  const payload = status === 204 ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Player, X-Jam",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 20_000) reject(new Error("big"));
      else chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("json"));
      }
    });
    req.on("error", reject);
  });
}

function tx(run) {
  db.exec("BEGIN");
  try {
    run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function shelfResult(status, stamp, shelf, inbox) {
  return { status, body: { stamp, shelf, inbox } };
}

function play(row, method, target, jam, body) {
  const skin = skinOf(row.skin);
  if (!skin) return shelfResult(409, "", [], []);
  const shelf = () => cardsOf(row.id, skin.id);
  if (jam) return shelfResult(500, "500", shelf(), []);
  if (method === "GET" && !target) return shelfResult(200, "200", shelf(), shelf());
  if (method === "GET" && (target === "99" || target === "new")) return shelfResult(404, "404", shelf(), []);
  if (method === "POST" && !target) {
    const made = { id: "8", owner: skin.owner, on: true };
    const existing = one(row.id, skin.id, "8");
    if (!existing) {
      const pos = db.prepare("SELECT COALESCE(MAX(pos), -1) + 1 AS pos FROM cards WHERE player_id = ? AND skin = ?").get(row.id, skin.id).pos;
      db.prepare("INSERT INTO cards (player_id, skin, card_id, owner, light_on, pos) VALUES (?, ?, ?, ?, ?, ?)").run(
        row.id, skin.id, made.id, made.owner, 1, pos,
      );
    }
    const saved = one(row.id, skin.id, "8");
    return shelfResult(201, "201", shelf(), [saved]);
  }
  if (method === "POST") return shelfResult(400, "", shelf(), []);
  const card = one(row.id, skin.id, target);
  if (!card) return shelfResult(404, "404", shelf(), []);
  if (method === "GET") return shelfResult(200, "200", shelf(), [{ ...card }]);
  if (method === "PUT") {
    if (!body || body.owner !== "" || body.on !== false) return shelfResult(400, "", shelf(), []);
    db.prepare("UPDATE cards SET owner = '', light_on = 0 WHERE player_id = ? AND skin = ? AND card_id = ?").run(row.id, skin.id, card.id);
    const next = { id: card.id, owner: "", on: false };
    return shelfResult(200, "200", shelf(), [next]);
  }
  if (method === "PATCH") {
    if (!body || body[skin.light] !== false) return shelfResult(400, "", shelf(), []);
    db.prepare("UPDATE cards SET light_on = 0 WHERE player_id = ? AND skin = ? AND card_id = ?").run(row.id, skin.id, card.id);
    const next = { ...card, on: false };
    return shelfResult(200, "200", shelf(), [next]);
  }
  return shelfResult(400, "", shelf(), []);
}

let tail = Promise.resolve();

const server = http.createServer((req, res) => {
  const job = tail.then(async () => {
  try {
    if (req.method === "OPTIONS") {
      send(res, 204, {});
      return;
    }
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const path = url.pathname;

    if (req.method === "GET" && path === "/api/health") {
      send(res, 200, { ok: true, db: "sqlite" });
      return;
    }

    const id = playerId(req);
    if (!id) {
      send(res, 401, { error: "player" });
      return;
    }
    const row = ensure(id);
    const body = req.method === "GET" ? {} : await readBody(req);

    if (req.method === "GET" && path === "/api/player") {
      send(res, 200, view(row));
      return;
    }

    if (req.method === "PATCH" && path === "/api/player") {
      const theme = body.theme === "light" ? "light" : "dark";
      db.prepare("UPDATE players SET theme = ?, updated_at = datetime('now') WHERE id = ?").run(theme, id);
      send(res, 200, view(ensure(id)));
      return;
    }

    if (req.method === "POST" && path === "/api/player/migrate") {
      const current = view(row);
      if (row.opened || row.skin || row.cleared || row.xp) {
        send(res, 200, current);
        return;
      }
      const cleared = Math.max(0, Math.min(WORDS.length, Number(body.cleared) || 0));
      const skin = skinOf(body.skin)?.id ?? "";
      const theme = body.theme === "light" ? "light" : "dark";
      const xp = XP.slice(0, cleared).reduce((sum, value) => sum + value, 0);
      db.prepare("UPDATE players SET skin = ?, cleared = ?, xp = ?, words = ?, theme = ?, opened = 1, updated_at = datetime('now') WHERE id = ?").run(
        skin, cleared, xp, JSON.stringify(WORDS.slice(0, cleared)), theme, id,
      );
      if (skin) seed(id, skinOf(skin), false);
      send(res, 200, view(ensure(id)));
      return;
    }

    if (req.method === "POST" && path === "/api/city") {
      const skin = body.skin === "" ? "" : skinOf(body.skin)?.id;
      if (skin === undefined) {
        send(res, 400, { error: "skin" });
        return;
      }
      tx(() => {
        db.prepare("UPDATE players SET skin = ?, cleared = 0, xp = 0, words = '[]', opened = 1, updated_at = datetime('now') WHERE id = ?").run(skin, id);
        db.prepare("DELETE FROM cards WHERE player_id = ?").run(id);
        db.prepare("DELETE FROM clears WHERE player_id = ?").run(id);
        if (skin) seed(id, skinOf(skin), false);
      });
      send(res, 200, view(ensure(id)));
      return;
    }

    if (req.method === "POST" && path === "/api/clears") {
      const index = Number(body.index);
      const current = ensure(id);
      if (!Number.isInteger(index) || index < 0 || index >= WORDS.length || index !== current.cleared) {
        send(res, 409, { ...view(current), awarded: false });
        return;
      }
      const words = view(current).words;
      if (!words.includes(WORDS[index])) words.push(WORDS[index]);
      tx(() => {
        db.prepare("UPDATE players SET cleared = ?, xp = xp + ?, words = ?, updated_at = datetime('now') WHERE id = ?").run(
          index + 1, XP[index], JSON.stringify(words), id,
        );
        db.prepare("INSERT INTO clears (player_id, level_index, xp) VALUES (?, ?, ?)").run(id, index, XP[index]);
      });
      send(res, 200, { ...view(ensure(id)), awarded: true });
      return;
    }

    if (path === "/api/shelves/reset" && req.method === "POST") {
      const skin = skinOf(row.skin);
      if (!skin) {
        send(res, 409, { stamp: "", shelf: [], inbox: [] });
        return;
      }
      seed(id, skin, body.empty === true);
      send(res, 200, { stamp: "", shelf: cardsOf(id, skin.id), inbox: [] });
      return;
    }

    if (path === "/api/shelves" || path.startsWith("/api/shelves/")) {
      const target = path === "/api/shelves" ? "" : decodeURIComponent(path.slice("/api/shelves/".length));
      if (target === "reset" || (target && !/^[0-9a-z]{1,8}$/.test(target))) {
        send(res, 404, { stamp: "404", shelf: [], inbox: [] });
        return;
      }
      const jam = req.headers["x-jam"] === "1";
      const result = play(ensure(id), req.method, target, jam, body);
      send(res, result.status, result.body);
      return;
    }

    send(res, 404, { error: "missing" });
  } catch (error) {
    if (!res.headersSent) send(res, 500, { error: "server" });
    else res.end();
    console.error(error);
  }
  });
  tail = job.then(() => undefined, () => undefined);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Helix API  http://127.0.0.1:${PORT}  db=${dbFile}`);
});
