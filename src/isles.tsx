import { useCallback, useEffect, useState } from "react";
import { clearMission, getMission, getPlayer, relay, saveTheme, type Mission, type Save } from "./api";

type Verb = "GET" | "POST";
type Hit = { method: Verb; path: string; auth: boolean; json: boolean; kettle: boolean; body: Record<string, unknown> | null; status: number; guess: number };

type Beat = {
  goal: string;
  base: string;
  methods: Verb[];
  paths: string[];
  method: Verb;
  path: string;
  auth: boolean;
  json: boolean;
  kettle: boolean;
  showAuth: boolean;
  showJson: boolean;
  showBody: boolean;
  showKettle: boolean;
  showCode: boolean;
  lock: boolean;
  body: string;
  kind: "send" | "predict" | "read";
  choices: number[];
  receipt?: Record<string, string | number>;
  pick?: string[];
  win: (hit: Hit) => boolean;
};

type Stage = { name: string; base: string; recall?: Beat; beats: Beat[] };

const ORDER = `{
  "tea_id": 12,
  "qty": 2,
  "name": "Asha"
}`;

function beat(partial: Partial<Beat> & Pick<Beat, "goal" | "win">): Beat {
  return {
    base: "chaiport.isle",
    methods: ["GET"],
    paths: ["/teas"],
    method: "GET",
    path: "/teas",
    auth: false,
    json: false,
    kettle: false,
    showAuth: false,
    showJson: false,
    showBody: false,
    showKettle: false,
    showCode: false,
    lock: false,
    body: "",
    kind: "send",
    choices: [200, 201, 400, 401, 404, 500],
    ...partial,
  };
}

const post = (goal: string, extra: Partial<Beat> & Pick<Beat, "win">): Beat =>
  beat({
    goal,
    methods: ["GET", "POST"],
    method: "POST",
    paths: ["/orders", "/teas"],
    path: "/orders",
    showAuth: true,
    showJson: true,
    showBody: true,
    auth: true,
    json: true,
    body: ORDER,
    ...extra,
  });

const STAGES: Stage[] = [
  {
    name: "Discover",
    base: "chaiport.isle",
    beats: [
      beat({
        goal: "Tray",
        paths: ["/tea", "/teas", "/orders"],
        path: "/tea",
        win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200,
      }),
    ],
  },
  {
    name: "Explore",
    base: "chaiport.isle",
    recall: beat({ goal: "Tray", paths: ["/teas"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200 }),
    beats: [
      beat({
        goal: "#12",
        paths: ["/teas", "/teas/12", "/teas/99"],
        path: "/teas",
        win: (hit) => hit.method === "GET" && hit.path === "/teas/12" && hit.status === 200,
      }),
      beat({
        goal: "#99",
        paths: ["/teas/12", "/teas/99"],
        path: "/teas/12",
        win: (hit) => hit.method === "GET" && hit.path === "/teas/99" && hit.status === 404,
      }),
      post("Asha", { win: (hit) => hit.method === "POST" && hit.path === "/orders" && hit.auth && hit.json && typeof hit.body?.qty === "number" && hit.status === 201 }),
      post("Bare", { auth: false, win: (hit) => hit.method === "POST" && hit.path === "/orders" && !hit.auth && hit.status === 401 }),
      beat({
        goal: "Kettle",
        paths: ["/kettle"],
        path: "/kettle",
        showKettle: true,
        win: (hit) => hit.path === "/kettle" && hit.kettle && hit.status === 200,
      }),
    ],
  },
  {
    name: "Assign",
    base: "chaiport.isle",
    recall: post("Ravi", {
      body: `{
  "tea_id": 3,
  "name": "Ravi"
}`,
      win: (hit) => hit.status === 400 && hit.body?.qty === undefined,
    }),
    beats: [
      beat({ goal: "List", paths: ["/teas"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200 }),
      beat({ goal: "#7", paths: ["/teas", "/teas/7"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas/7" && hit.status === 200 }),
      post("2 Masala", { win: (hit) => hit.status === 201 && hit.body?.name === "Asha" && hit.body?.qty === 2 && hit.body?.tea_id === 12 }),
      post("3 Ginger", {
        body: `{
  "tea_id": 7,
  "qty": 3,
  "name": "Ravi",
  "note": ""
}`,
        win: (hit) => hit.status === 201 && hit.body?.note === "less sugar" && hit.body?.qty === 3,
      }),
    ],
  },
  {
    name: "Predict",
    base: "chaiport.isle",
    recall: beat({ goal: "#7", paths: ["/teas/7"], path: "/teas/7", win: (hit) => hit.path === "/teas/7" && hit.status === 200 }),
    beats: [
      beat({ goal: "", lock: true, kind: "predict", path: "/teas", paths: ["/teas"], win: (hit) => hit.guess === 200 && hit.status === 200 }),
      beat({ goal: "", lock: true, kind: "predict", path: "/teas/99", paths: ["/teas/99"], win: (hit) => hit.guess === 404 && hit.status === 404 }),
      post("", { lock: true, kind: "predict", auth: false, win: (hit) => hit.guess === 401 && hit.status === 401 }),
      post("", {
        lock: true,
        kind: "predict",
        body: `{
  "tea_id": 12,
  "name": "Asha"
}`,
        win: (hit) => hit.guess === 400 && hit.status === 400,
      }),
      post("", { lock: true, kind: "predict", win: (hit) => hit.guess === 201 && hit.status === 201 }),
    ],
  },
  {
    name: "Code",
    base: "chaiport.isle",
    recall: post("", { auth: false, showCode: true, win: (hit) => hit.auth && hit.status === 201 }),
    beats: [
      beat({
        goal: "",
        showCode: true,
        paths: ["/teas", "/tea"],
        path: "",
        win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200,
      }),
      post("", { showCode: true, auth: false, json: false, win: (hit) => hit.auth && hit.json && typeof hit.body?.qty === "number" && hit.status === 201 }),
    ],
  },
  {
    name: "Debug",
    base: "chaiport.isle",
    recall: post("2", {
      body: `{
  "tea_id": 12,
  "qty": "2",
  "name": "Asha"
}`,
      win: (hit) => hit.status === 201 && hit.body?.qty === 2,
    }),
    beats: [
      post("/orders", {
        paths: ["/order", "/orders"],
        path: "/order",
        win: (hit) => hit.path === "/orders" && hit.status === 201,
      }),
      post("PASS", { auth: false, win: (hit) => hit.auth && hit.status === 201 }),
      post("2", {
        body: `{
  "tea_id": 12,
  "qty": "two",
  "name": "Asha"
}`,
        win: (hit) => hit.status === 201 && hit.body?.qty === 2,
      }),
      beat({
        goal: "Kettle",
        paths: ["/kettle"],
        path: "/kettle",
        showKettle: true,
        win: (hit) => hit.kettle && hit.status === 200,
      }),
    ],
  },
  {
    name: "Master",
    base: "lanterns.isle",
    recall: post("PASS", { auth: false, win: (hit) => hit.auth && hit.json && hit.status === 201 }),
    beats: [
      beat({
        goal: "Moon",
        base: "lanterns.isle",
        paths: ["/lanterns"],
        path: "/lanterns",
        win: (hit) => hit.method === "GET" && hit.path === "/lanterns" && hit.status === 200,
      }),
      post("3 days", {
        base: "lanterns.isle",
        paths: ["/rentals", "/lanterns"],
        path: "/rentals",
        body: `{
  "lantern_id": 7,
  "days": 3
}`,
        win: (hit) => hit.path === "/rentals" && hit.status === 201 && hit.body?.lantern_id === 7 && hit.body?.days === 3,
      }),
      beat({
        goal: "L9",
        kind: "read",
        base: "lanterns.isle",
        receipt: { rental_id: "L9", lantern_id: 7, return_by: "Festival day 3" },
        pick: ["rental_id", "return_by"],
        win: () => false,
      }),
      post("Star", {
        base: "lanterns.isle",
        paths: ["/rentals"],
        path: "/rentals",
        auth: false,
        body: `{
  "lantern_id": 2,
  "days": 2
}`,
        win: (hit) => hit.path === "/rentals" && hit.auth && hit.status === 201,
      }),
    ],
  },
];

const ISLANDS = ["Chai Port", "Keygate", "Tidewall", "Echo Market", "Oracle Steps", "Whisper Loft", "Glass Archive", "Lighthouse"];

const FEED: [string, string, string][] = [
  ["miss", "GET /tea", "404"],
  ["land", "GET /teas", "200 · Masala"],
  ["order", "POST /orders", "201 · Asha"],
  ["read", "GET /teas/12", "200 · #12"],
  ["heat", "GET /kettle", "200 · hot"],
  ["rank", "POST /rentals", "201 · L9"],
];

function league(stage: number) {
  if (stage >= 6) return "Gold";
  if (stage >= 3) return "Silver";
  return "Bronze";
}

function Replay() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(FEED.length);
      return;
    }
    const timer = window.setInterval(() => {
      setCount((value) => (value >= FEED.length ? 1 : value + 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="tape" aria-hidden="true">
      <p className="tape-path">~/relay/chai-port</p>
      <p className="tape-prompt">&gt; Tray for Asha.</p>
      {FEED.slice(0, count).map(([verb, call, note]) => (
        <p key={verb} className="tape-line"><b>{verb}</b><span>{call}</span><em>{note}</em></p>
      ))}
    </div>
  );
}

function normalize(pathname: string) {
  const path = pathname || "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function useRoute() {
  const [path, setPath] = useState(() => normalize(window.location.pathname));
  useEffect(() => {
    const sync = () => setPath(normalize(window.location.pathname));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const go = useCallback((next: string, replace = false) => {
    const clean = normalize(next);
    if (window.location.pathname !== clean) {
      const change = replace ? window.history.replaceState : window.history.pushState;
      change.call(window.history, {}, "", clean);
    }
    setPath(clean);
  }, []);
  return { path, go };
}

function click(event: { preventDefault(): void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number }, href: string, go: (href: string) => void) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  go(href);
}

export function Isles() {
  const { path, go } = useRoute();
  const [mission, setMission] = useState<Mission>({ stage: 0, xp: 0 });
  const [theme, setTheme] = useState<Save["theme"]>("dark");
  const [known, setKnown] = useState(false);
  const levelNo = /^\/play\/([1-7])$/.exec(path);
  const playing = levelNo ? Number(levelNo[1]) - 1 : -1;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.title = "DevQuest";
  }, [theme]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [progress, player] = await Promise.all([getMission(), getPlayer()]);
        if (!live) return;
        setMission({ stage: progress.stage, xp: progress.xp });
        setTheme(player.theme);
      } catch {
        /* local play still runs; clears retry on the next send */
      } finally {
        if (live) setKnown(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (path === "/") {
      go("/home", true);
      return;
    }
    if (!known) return;
    const page = path === "/home" || path === "/map" || path === "/mission" || path === "/win" || playing >= 0;
    if (!page) {
      go("/home", true);
      return;
    }
    if (playing > mission.stage) go(mission.stage >= 7 ? "/win" : `/play/${mission.stage + 1}`, true);
    if (path === "/win" && mission.stage < 7) go(`/play/${Math.min(mission.stage, 6) + 1}`, true);
  }, [path, playing, mission.stage, known, go]);

  function finish(index: number) {
    setMission((current) => ({ stage: Math.max(current.stage, index + 1), xp: current.xp + (index === current.stage ? [20, 25, 30, 20, 25, 25, 40][index] : 0) }));
    go(index + 1 >= STAGES.length ? "/win" : `/play/${index + 2}`);
    void clearMission(index)
      .then((next) => setMission({ stage: next.stage, xp: next.xp }))
      .catch(() => {});
  }

  const continueHref = mission.stage >= 7 ? "/win" : mission.stage === 0 ? "/map" : `/play/${mission.stage + 1}`;

  return (
    <div className={`isles${theme === "light" ? " lite" : ""}${playing >= 0 ? " play" : ""}`}>
      <header className="isles-top">
        <a className="word" href="/home" onClick={(event) => click(event, "/home", go)}><span>Dev</span>Quest</a>
        <span className="spacer" />
        {(playing >= 0 || path === "/win") && (
          <nav className="pips">
            {STAGES.map((stage, index) => (
              index > mission.stage ? <span key={stage.name} className="pip locked">{index + 1}</span> : (
                <a key={stage.name} className={`pip ${index < mission.stage ? "done" : ""} ${index === playing ? "now" : ""}`} href={`/play/${index + 1}`} onClick={(event) => click(event, `/play/${index + 1}`, go)}>{index < mission.stage ? "★" : index + 1}</a>
              )
            ))}
          </nav>
        )}
        <b className="score">{mission.xp}</b>
        <button className="btn small ghost" aria-label={theme === "dark" ? "Light" : "Dark"} onClick={() => {
          const next = theme === "dark" ? "light" : "dark";
          setTheme(next);
          void saveTheme(next).catch(() => {});
        }}>{theme === "dark" ? "☀" : "☾"}</button>
      </header>

      {path === "/home" && (
        <main className="arena">
          <p className="kicker">The arena</p>
          <h1>Send it. <em>The island stamps it.</em></h1>
          <a className="arena-go" href={continueHref} onClick={(event) => click(event, continueHref, go)}>{mission.stage === 0 ? "Enter the relay" : "Continue"}</a>
          <a className="arena-alt" href="/map" onClick={(event) => click(event, "/map", go)}>Isles</a>
          <Replay />
          <div className="meters">
            <article><small>Score</small><b>{mission.xp}</b></article>
            <article><small>Cleared</small><b>{Math.min(mission.stage, 7)}<span>/7</span></b></article>
            <article className="wide"><small>League</small><b>{league(mission.stage)}</b></article>
          </div>
          <div className="modes">
            <a className="mode open" href={continueHref} onClick={(event) => click(event, continueHref, go)}>
              <small>Open</small><strong>Relay Isles</strong><em>{Math.min(mission.stage, 7)} / 7</em>
            </a>
            <article className="mode done"><small>Done</small><strong>Foundations</strong></article>
            <article className="mode done"><small>Done</small><strong>Data & Logic</strong></article>
            <article className="mode shut"><small>Locked</small><strong>Next</strong></article>
          </div>
        </main>
      )}

      {path === "/map" && (
        <main className="map">
          {ISLANDS.map((name, index) => (
            index === 0 ? (
              <button key={name} className="isle open" onClick={() => go(mission.stage === 0 ? "/mission" : mission.stage >= 7 ? "/win" : `/play/${mission.stage + 1}`)}>
                <i />
                <b>{name}</b>
              </button>
            ) : (
              <article key={name} className="isle shut"><i /><b>{name}</b></article>
            )
          ))}
        </main>
      )}

      {path === "/mission" && (
        <main className="brief">
          <h1>Chai Port</h1>
          <a className="btn amber big" href="/play/1" onClick={(event) => click(event, "/play/1", go)}>Dispatch</a>
        </main>
      )}

      {playing >= 0 && playing <= mission.stage && (
        <StagePlay key={playing} index={playing} onWin={() => finish(playing)} />
      )}

      {path === "/win" && mission.stage >= 7 && (
        <main className="brief">
          <p className="kicker">{mission.xp} XP</p>
          <h1>Clear</h1>
          <div className="chips">{STAGES.map((stage) => <span key={stage.name}>★</span>)}</div>
          <div className="row">
            <a className="btn primary" href="/play/1" onClick={(event) => click(event, "/play/1", go)}>Replay</a>
            <a className="btn ghost" href="/map" onClick={(event) => click(event, "/map", go)}>Isles</a>
          </div>
        </main>
      )}
    </div>
  );
}

function StagePlay({ index, onWin }: { index: number; onWin: () => void }) {
  const stage = STAGES[index];
  const [recallDone, setRecallDone] = useState(!stage.recall);
  const [step, setStep] = useState(0);
  const spec = !recallDone && stage.recall ? stage.recall : stage.beats[step];
  const [method, setMethod] = useState<Verb>(spec.method);
  const [resource, setResource] = useState(spec.path);
  const [auth, setAuth] = useState(spec.auth);
  const [jsonOn, setJsonOn] = useState(spec.json);
  const [kettle, setKettle] = useState(spec.kettle);
  const [bodyText, setBodyText] = useState(spec.body);
  const [guess, setGuess] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState(0);
  const [reply, setReply] = useState<unknown>(null);
  const [flying, setFlying] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setMethod(spec.method);
    setResource(spec.path);
    setAuth(spec.auth);
    setJsonOn(spec.json);
    setKettle(spec.kettle);
    setBodyText(spec.body);
    setGuess(0);
    setPicked([]);
    setStatus(0);
    setReply(null);
  }, [spec]);

  function advance() {
    if (!recallDone) {
      setRecallDone(true);
      return;
    }
    if (step + 1 >= stage.beats.length) onWin();
    else setStep((value) => value + 1);
  }

  function miss() {
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  }

  async function send() {
    if (flying) return;
    let parsed: Record<string, unknown> | null = null;
    if (spec.showBody && bodyText.trim()) {
      try {
        parsed = JSON.parse(bodyText) as Record<string, unknown>;
      } catch {
        miss();
        return;
      }
    }
    if (spec.kind === "predict" && !guess) return;
    setFlying(true);
    const hitBase = { method, path: resource, auth, json: jsonOn, kettle, body: parsed, guess };
    try {
      const result = await relay(method, resource || "/", { auth, json: jsonOn, body: parsed, kettle });
      const hit = { ...hitBase, status: result.status };
      setStatus(result.status);
      setReply(result.body);
      if (spec.win(hit)) advance();
      else miss();
    } catch {
      miss();
    } finally {
      setFlying(false);
    }
  }

  const slip = `chai.${method === "GET" ? "get" : "post"}("${resource}")`;
  const crates = cargoOf(reply);
  const slots = spec.showBody ? slotsOf(bodyText) : [];

  function poke(key: string) {
    try {
      const data = JSON.parse(bodyText) as Record<string, unknown>;
      if (key === "qty") data.qty = 2;
      if (key === "note") data.note = "less sugar";
      setBodyText(JSON.stringify(data, null, 2));
    } catch {
      miss();
    }
  }

  return (
    <section className={`stage ${shake ? "shake" : ""}`}>
      <div className={`sky ${spec.base === "lanterns.isle" ? "night" : ""}`}>
        <div className={`parcel ${flying ? "fly" : ""}`}>
          {spec.goal && <b>{spec.goal}</b>}
          <em>{method} {resource || "/"}</em>
          {spec.showCode && <code>{slip}</code>}
          {slots.length > 0 && (
            <div className="slots">
              {slots.map((slot) => (
                <button key={slot.key} type="button" disabled={spec.lock} onClick={() => poke(slot.key)}>{slot.value || "·"}</button>
              ))}
            </div>
          )}
        </div>
        <div className="island">
          <i />
          {status > 0 && <div className={`seal ${status >= 500 ? "bad" : status >= 400 ? "warn" : "ok"}`}>{status}</div>}
          <div className="cargo">
            {crates.map((item) => (
              <article key={item.title + item.meta}><b>{item.title}</b>{item.meta && <span>{item.meta}</span>}</article>
            ))}
          </div>
          {spec.kind === "read" && spec.receipt && (
            <div className="cargo">
              {Object.entries(spec.receipt).map(([key, value]) => (
                <button key={key} className={picked.includes(key) ? "on" : ""} onClick={() => {
                  const next = picked.includes(key) ? picked.filter((item) => item !== key) : [...picked, key];
                  setPicked(next);
                  const need = spec.pick ?? [];
                  if (need.length > 0 && need.every((item) => next.includes(item)) && next.length === need.length) advance();
                }}>{value}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {spec.kind !== "read" && (
        <form className="hud" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <div className="verb-keys">
            {spec.methods.map((verb) => (
              <button key={verb} type="button" className={`key ${method === verb ? "on" : ""}`} disabled={spec.lock} onClick={() => setMethod(verb)}>{verb}</button>
            ))}
          </div>
          <div className="path-chips">
            {spec.paths.map((item) => (
              <button key={item} type="button" disabled={spec.lock} className={resource === item ? "on" : status === 404 && item === "/teas" ? "hint" : ""} onClick={() => setResource(item)}>{item}</button>
            ))}
          </div>
          {spec.showAuth && <button type="button" className={`key ${auth ? "on" : ""}`} disabled={spec.lock} onClick={() => setAuth((value) => !value)}>PASS</button>}
          {spec.showJson && <button type="button" className={`key ${jsonOn ? "on" : ""}`} disabled={spec.lock} onClick={() => setJsonOn((value) => !value)}>JSON</button>}
          {spec.showKettle && <button type="button" className={`key ${kettle ? "on" : ""}`} onClick={() => setKettle((value) => !value)}>HOT</button>}
          {spec.kind === "predict" && spec.choices.map((code) => (
            <button key={code} type="button" className={`key ${guess === code ? "on" : ""}`} onClick={() => setGuess(code)}>{code}</button>
          ))}
          <button className="btn amber big" type="submit" disabled={flying || (spec.kind === "predict" && !guess)}>Dispatch</button>
        </form>
      )}
    </section>
  );
}

function cargoOf(reply: unknown) {
  if (Array.isArray(reply)) {
    return reply.map((item) => {
      const row = item as { name?: string; price?: number; id?: number };
      return { title: row.name ?? String(row.id ?? ""), meta: row.price ? String(row.price) : "" };
    });
  }
  if (reply && typeof reply === "object") {
    const row = reply as Record<string, unknown>;
    if (row.error) return [];
    if (typeof row.name === "string") return [{ title: row.name, meta: String(row.price ?? row.status ?? "") }];
    if (typeof row.order_id === "string") return [{ title: String(row.name || row.order_id), meta: String(row.qty ?? row.status ?? "") }];
    if (typeof row.rental_id === "string") return [{ title: String(row.rental_id), meta: String(row.return_by ?? "") }];
    if (row.kettle) return [{ title: "Hot", meta: "" }];
  }
  return [];
}

function slotsOf(text: string) {
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    return Object.entries(data).map(([key, value]) => ({ key, value: value === "" ? "" : String(value) }));
  } catch {
    return [];
  }
}
