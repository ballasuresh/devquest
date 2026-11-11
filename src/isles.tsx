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
        goal: "Open the shelf",
        paths: ["/tea", "/teas", "/orders"],
        path: "/tea",
        win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200,
      }),
    ],
  },
  {
    name: "Explore",
    base: "chaiport.isle",
    recall: beat({ goal: "Shelf again", paths: ["/teas"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200 }),
    beats: [
      beat({
        goal: "One jar",
        paths: ["/teas", "/teas/12", "/teas/99"],
        path: "/teas",
        win: (hit) => hit.method === "GET" && hit.path === "/teas/12" && hit.status === 200,
      }),
      beat({
        goal: "Missing jar",
        paths: ["/teas/12", "/teas/99"],
        path: "/teas/12",
        win: (hit) => hit.method === "GET" && hit.path === "/teas/99" && hit.status === 404,
      }),
      post("Drop off", { win: (hit) => hit.method === "POST" && hit.path === "/orders" && hit.auth && hit.json && typeof hit.body?.qty === "number" && hit.status === 201 }),
      post("No pass", { auth: false, win: (hit) => hit.method === "POST" && hit.path === "/orders" && !hit.auth && hit.status === 401 }),
      beat({
        goal: "Their kettle",
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
    recall: post("Missing qty", {
      body: `{
  "tea_id": 3,
  "name": "Ravi"
}`,
      win: (hit) => hit.status === 400 && hit.body?.qty === undefined,
    }),
    beats: [
      beat({ goal: "Full list", paths: ["/teas"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200 }),
      beat({ goal: "Ginger", paths: ["/teas", "/teas/7"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas/7" && hit.status === 200 }),
      post("Asha", { win: (hit) => hit.status === 201 && hit.body?.name === "Asha" && hit.body?.qty === 2 && hit.body?.tea_id === 12 }),
      post("Less sugar", {
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
    recall: beat({ goal: "Ginger again", paths: ["/teas/7"], path: "/teas/7", win: (hit) => hit.path === "/teas/7" && hit.status === 200 }),
    beats: [
      beat({ goal: "Call it", lock: true, kind: "predict", path: "/teas", paths: ["/teas"], win: (hit) => hit.guess === 200 && hit.status === 200 }),
      beat({ goal: "Call it", lock: true, kind: "predict", path: "/teas/99", paths: ["/teas/99"], win: (hit) => hit.guess === 404 && hit.status === 404 }),
      post("Call it", { lock: true, kind: "predict", auth: false, win: (hit) => hit.guess === 401 && hit.status === 401 }),
      post("Call it", {
        lock: true,
        kind: "predict",
        body: `{
  "tea_id": 12,
  "name": "Asha"
}`,
        win: (hit) => hit.guess === 400 && hit.status === 400,
      }),
      post("Call it", { lock: true, kind: "predict", win: (hit) => hit.guess === 201 && hit.status === 201 }),
    ],
  },
  {
    name: "Code",
    base: "chaiport.isle",
    recall: post("Pass on", { auth: false, showCode: true, win: (hit) => hit.auth && hit.status === 201 }),
    beats: [
      beat({
        goal: "get",
        showCode: true,
        paths: ["/teas", "/tea"],
        path: "",
        win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200,
      }),
      post("post", { showCode: true, auth: false, json: false, win: (hit) => hit.auth && hit.json && typeof hit.body?.qty === "number" && hit.status === 201 }),
    ],
  },
  {
    name: "Debug",
    base: "chaiport.isle",
    recall: post("Number", {
      body: `{
  "tea_id": 12,
  "qty": "2",
  "name": "Asha"
}`,
      win: (hit) => hit.status === 201 && hit.body?.qty === 2,
    }),
    beats: [
      post("Address", {
        paths: ["/order", "/orders"],
        path: "/order",
        win: (hit) => hit.path === "/orders" && hit.status === 201,
      }),
      post("Pass", { auth: false, win: (hit) => hit.auth && hit.status === 201 }),
      post("Word", {
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
    recall: post("Labels", { auth: false, win: (hit) => hit.auth && hit.json && hit.status === 201 }),
    beats: [
      beat({
        goal: "Scout",
        base: "lanterns.isle",
        paths: ["/lanterns"],
        path: "/lanterns",
        win: (hit) => hit.method === "GET" && hit.path === "/lanterns" && hit.status === 200,
      }),
      post("Rent", {
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
        goal: "Receipt",
        kind: "read",
        base: "lanterns.isle",
        receipt: { rental_id: "L9", lantern_id: 7, return_by: "Festival day 3" },
        pick: ["rental_id", "return_by"],
        win: () => false,
      }),
      post("Bounce", {
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
    <div className="isles">
      <header className="isles-top">
        <a href="/home" onClick={(event) => click(event, "/home", go)}>DevQuest</a>
        <div className="g-xp" aria-label={`${mission.xp} XP`}><span style={{ width: `${Math.min(100, (mission.xp / 185) * 100)}%` }} /></div>
        <b>{mission.xp}</b>
        {(playing >= 0 || path === "/win") && (
          <nav className="pips">
            {STAGES.map((stage, index) => (
              index > mission.stage ? <span key={stage.name} className="pip locked">{index + 1}</span> : (
                <a key={stage.name} className={`pip ${index < mission.stage ? "done" : ""} ${index === playing ? "now" : ""}`} href={`/play/${index + 1}`} onClick={(event) => click(event, `/play/${index + 1}`, go)}>{index < mission.stage ? "★" : index + 1}</a>
              )
            ))}
          </nav>
        )}
        <button className="btn small ghost" aria-label={theme === "dark" ? "Light" : "Dark"} onClick={() => {
          const next = theme === "dark" ? "light" : "dark";
          setTheme(next);
          void saveTheme(next).catch(() => {});
        }}>{theme === "dark" ? "☀" : "☾"}</button>
      </header>

      {path === "/home" && (
        <main className="desk">
          <a className="world open" href={continueHref} onClick={(event) => click(event, continueHref, go)}>
            <small>03</small>
            <strong>Relay Isles</strong>
            <em>{Math.min(mission.stage, 7)} / 7</em>
          </a>
          <article className="world done"><small>01</small><strong>Foundations</strong></article>
          <article className="world done"><small>02</small><strong>Data & Logic</strong></article>
          <article className="world shut"><small>04</small><strong>Locked</strong></article>
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
          <p className="kicker">Mission 01</p>
          <h1>Chai Port</h1>
          <div className="chips"><span>GET</span><span>POST</span><span>200</span></div>
          <a className="btn primary big" href="/play/1" onClick={(event) => click(event, "/play/1", go)}>Take the job</a>
        </main>
      )}

      {playing >= 0 && playing <= mission.stage && (
        <StagePlay key={playing} index={playing} onWin={() => finish(playing)} />
      )}

      {path === "/win" && mission.stage >= 7 && (
        <main className="brief">
          <p className="kicker">{mission.xp} XP</p>
          <h1>Courier</h1>
          <div className="chips">{STAGES.map((stage) => <span key={stage.name}>{stage.name}</span>)}</div>
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

  const line = spec.showCode
    ? `chai.${method === "GET" ? "get" : "post"}("${resource}"${method === "POST" ? ", …)" : ")"}`
    : "";

  return (
    <section className={`board ${shake ? "shake" : ""}`}>
      <div className="board-head">
        <p className="kicker">{stage.name}{!recallDone ? " · again" : ` · ${step + 1}/${stage.beats.length}`}</p>
        <h2>{spec.goal}</h2>
      </div>
      <div className="board-split">
        <div className="reply">
          <div className={`seal ${status >= 500 ? "bad" : status >= 400 ? "warn" : status >= 200 ? "ok" : ""}`}>{status || "—"}</div>
          <pre>{reply ? JSON.stringify(reply, null, 2) : ""}</pre>
          {spec.kind === "read" && spec.receipt && (
            <div className="receipt">
              {Object.entries(spec.receipt).map(([key, value]) => (
                <button key={key} className={picked.includes(key) ? "on" : ""} onClick={() => {
                  const next = picked.includes(key) ? picked.filter((item) => item !== key) : [...picked, key];
                  setPicked(next);
                  const need = spec.pick ?? [];
                  if (need.length > 0 && need.every((item) => next.includes(item)) && next.length === need.length) advance();
                }}><b>{key}</b><span>{value}</span></button>
              ))}
            </div>
          )}
        </div>
        {spec.kind !== "read" && (
          <form className="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <div className="verb-keys">
              {spec.methods.map((verb) => (
                <button key={verb} type="button" className={`key ${method === verb ? "on" : ""}`} disabled={spec.lock} onClick={() => setMethod(verb)}>{verb}</button>
              ))}
            </div>
            <label className="path-line">
              <span>{spec.base}</span>
              <input value={resource} disabled={spec.lock} onChange={(event) => setResource(event.target.value.startsWith("/") || event.target.value === "" ? event.target.value : `/${event.target.value}`)} />
            </label>
            {!spec.lock && (
              <div className="path-chips">
                {spec.paths.map((item) => (
                  <button key={item} type="button" className={resource === item ? "on" : status === 404 && item === "/teas" ? "hint" : ""} onClick={() => setResource(item)}>{item}</button>
                ))}
              </div>
            )}
            <div className="verb-keys">
              {spec.showAuth && <button type="button" className={`key ${auth ? "on" : ""}`} disabled={spec.lock} onClick={() => setAuth((value) => !value)}>PASS</button>}
              {spec.showJson && <button type="button" className={`key ${jsonOn ? "on" : ""}`} disabled={spec.lock} onClick={() => setJsonOn((value) => !value)}>JSON</button>}
              {spec.showKettle && <button type="button" className={`key ${kettle ? "on" : ""}`} onClick={() => setKettle((value) => !value)}>KETTLE</button>}
            </div>
            {spec.showBody && (
              <textarea value={bodyText} spellCheck={false} disabled={spec.lock} onChange={(event) => setBodyText(event.target.value)} />
            )}
            {spec.showCode && <code className="py">{line}</code>}
            {spec.kind === "predict" && (
              <div className="path-chips">
                {spec.choices.map((code) => (
                  <button key={code} type="button" className={guess === code ? "on" : ""} onClick={() => setGuess(code)}>{code}</button>
                ))}
              </div>
            )}
            <button className="btn primary big" type="submit" disabled={flying || (spec.kind === "predict" && !guess)}>Send</button>
          </form>
        )}
      </div>
    </section>
  );
}
