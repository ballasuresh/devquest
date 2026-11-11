export type Save = { skin: string; cleared: number; xp: number; words: string[]; theme: "dark" | "light" };
export type Card = { id: string; owner: string; on: boolean };
export type World = { shelf: Card[]; inbox: Card[]; stamp: string };

const PLAYER = "dq-player";

export function playerId() {
  let id = localStorage.getItem(PLAYER);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER, id);
  }
  return id;
}

function headers(json = false): HeadersInit {
  const value: Record<string, string> = { "X-Player": playerId() };
  if (json) value["Content-Type"] = "application/json";
  return value;
}

async function take<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  if (!res.ok) throw new Error(String(res.status));
  return data;
}

export async function getPlayer(): Promise<Save> {
  return take(await fetch("/api/player", { headers: headers() }));
}

export async function migrate(save: Save): Promise<Save> {
  return take(await fetch("/api/player/migrate", { method: "POST", headers: headers(true), body: JSON.stringify(save) }));
}

export async function saveTheme(theme: Save["theme"]): Promise<Save> {
  return take(await fetch("/api/player", { method: "PATCH", headers: headers(true), body: JSON.stringify({ theme }) }));
}

export async function chooseCity(skin: string): Promise<Save> {
  return take(await fetch("/api/city", { method: "POST", headers: headers(true), body: JSON.stringify({ skin }) }));
}

export async function clearLevel(index: number): Promise<Save & { awarded: boolean }> {
  const res = await fetch("/api/clears", { method: "POST", headers: headers(true), body: JSON.stringify({ index }) });
  const data = (await res.json()) as Save & { awarded: boolean };
  if (!res.ok && res.status !== 409) throw new Error(String(res.status));
  return data;
}

export async function resetShelf(empty: boolean): Promise<World> {
  return take(await fetch("/api/shelves/reset", { method: "POST", headers: headers(true), body: JSON.stringify({ empty }) }));
}

export async function sendShelf(verb: string, target: string, jam: boolean, light: string): Promise<World> {
  const head = headers(verb !== "GET") as Record<string, string>;
  if (jam) head["X-Jam"] = "1";
  let url = "/api/shelves";
  let body: string | undefined;
  if (verb === "GET" && target !== "all") url = `/api/shelves/${encodeURIComponent(target)}`;
  if (verb === "POST" && target !== "all" && target !== "new") url = `/api/shelves/${encodeURIComponent(target)}`;
  if (verb === "PUT" || verb === "PATCH") url = `/api/shelves/${encodeURIComponent(target)}`;
  if (verb === "PUT") body = JSON.stringify({ id: target, owner: "", on: false });
  if (verb === "PATCH") body = JSON.stringify({ [light]: false });
  const res = await fetch(url, { method: verb, headers: head, body });
  const data = (await res.json()) as World;
  if (!data || !Array.isArray(data.shelf)) throw new Error("shelf");
  return data;
}
