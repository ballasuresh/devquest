export type RouteId = "title" | "play" | "academy" | "line" | "dials" | "howto" | "settings" | "scores";

export const PATH: Record<RouteId, string> = {
  title: "/",
  play: "/play",
  academy: "/academy",
  line: "/academy/line",
  dials: "/academy/dials",
  howto: "/how-to-play",
  settings: "/settings",
  scores: "/scores",
};

export function parseHash(hash = typeof location !== "undefined" ? location.hash : ""): RouteId {
  const raw = (hash.replace(/^#/, "") || "/").split("?")[0].replace(/\/$/, "") || "/";
  const p = raw.startsWith("/") ? raw : `/${raw}`;
  if (p === "/play" || p === "/arena") return "play";
  if (p === "/academy" || p === "/hub" || p === "/district") return "academy";
  if (p === "/academy/line" || p === "/line") return "line";
  if (p === "/academy/dials" || p === "/dials") return "dials";
  if (p === "/how-to-play" || p === "/controls" || p === "/help") return "howto";
  if (p === "/settings") return "settings";
  if (p === "/scores" || p === "/stats") return "scores";
  return "title";
}

export function href(id: RouteId) {
  return `#${PATH[id]}`;
}

export function go(id: RouteId, replace = false) {
  const next = `#${PATH[id]}`;
  if (typeof location === "undefined") return;
  if (replace) {
    history.replaceState(null, "", next);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  if (location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  location.hash = PATH[id];
}

export function goBack(fallback: RouteId = "title") {
  const here = parseHash();
  const parent: Partial<Record<RouteId, RouteId>> = {
    line: "academy",
    dials: "academy",
    academy: "title",
    howto: "title",
    settings: "title",
    scores: "title",
    play: "title",
  };
  // Prefer real history when it would leave this page.
  const prev = document.referrer;
  if (history.length > 1 && prev !== undefined) {
    history.back();
    // If we're still here a beat later, force the parent.
    window.setTimeout(() => {
      if (parseHash() === here) go(parent[here] ?? fallback, true);
    }, 80);
    return;
  }
  go(parent[here] ?? fallback);
}

export function ensureHash() {
  if (typeof location === "undefined") return;
  if (!location.hash) history.replaceState(null, "", "#/");
}
