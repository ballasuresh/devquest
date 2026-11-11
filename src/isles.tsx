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
  kind: "send" | "predict" | "read" | "album" | "blanks";
  choices: number[];
  receipt?: Record<string, string | number>;
  pick?: string[];
  aim?: string;
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
        goal: "404",
        paths: ["/tea", "/teas", "/orders"],
        path: "/tea",
        win: (hit) => hit.method === "GET" && hit.path === "/tea" && hit.status === 404,
      }),
      beat({
        goal: "Tray",
        paths: ["/tea", "/teas", "/orders"],
        path: "/tea",
        aim: "/teas",
        win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200,
      }),
    ],
  },
  {
    name: "Explore",
    base: "chaiport.isle",
    recall: beat({
      goal: "Tray",
      paths: ["/tea", "/teas"],
      path: "/tea",
      aim: "/teas",
      win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200,
    }),
    beats: [
      beat({ goal: "Shelf", paths: ["/teas"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200 }),
      beat({
        goal: "#12",
        paths: ["/teas", "/teas/12", "/teas/99"],
        path: "/teas",
        aim: "/teas/12",
        win: (hit) => hit.method === "GET" && hit.path === "/teas/12" && hit.status === 200,
      }),
      beat({
        goal: "#99",
        paths: ["/teas/12", "/teas/99"],
        path: "/teas/12",
        aim: "/teas/99",
        win: (hit) => hit.method === "GET" && hit.path === "/teas/99" && hit.status === 404,
      }),
      beat({
        goal: "A42",
        paths: ["/orders", "/orders/A42"],
        path: "/orders",
        aim: "/orders/A42",
        win: (hit) => hit.method === "GET" && hit.path === "/orders/A42" && hit.status === 200,
      }),
      post("Bare", { auth: false, win: (hit) => hit.method === "POST" && hit.path === "/orders" && !hit.auth && hit.status === 401 }),
      post("Sticker", { json: false, win: (hit) => hit.method === "POST" && hit.auth && !hit.json && hit.status === 400 }),
      post("Asha", { win: (hit) => hit.method === "POST" && hit.path === "/orders" && hit.auth && hit.json && typeof hit.body?.qty === "number" && hit.status === 201 }),
      post("Qty", {
        lock: true,
        body: `{
  "tea_id": 12,
  "name": "Asha"
}`,
        win: (hit) => hit.status === 400 && hit.body?.qty === undefined,
      }),
      post("\"2\"", {
        lock: true,
        body: `{
  "tea_id": 12,
  "qty": "2",
  "name": "Asha"
}`,
        win: (hit) => hit.status === 400 && hit.body?.qty === "2",
      }),
      beat({
        goal: "Kettle",
        paths: ["/kettle"],
        path: "/kettle",
        showKettle: true,
        win: (hit) => hit.path === "/kettle" && hit.kettle && hit.status === 200,
      }),
      beat({
        goal: "Book",
        kind: "album",
        methods: ["GET", "POST"],
        method: "GET",
        paths: ["/teas", "/tea", "/orders", "/kettle"],
        path: "/teas",
        showAuth: true,
        showJson: true,
        showBody: true,
        showKettle: true,
        body: `{
  "tea_id": 12,
  "qty": "",
  "name": "Asha"
}`,
        win: () => false,
      }),
    ],
  },
  {
    name: "Assign",
    base: "chaiport.isle",
    recall: post("Ravi", {
      body: `{
  "tea_id": 3,
  "qty": "",
  "name": "Ravi"
}`,
      win: (hit) => hit.status === 201 && typeof hit.body?.qty === "number",
    }),
    beats: [
      beat({ goal: "List", paths: ["/teas"], path: "/teas", win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200 }),
      beat({ goal: "#7", paths: ["/teas", "/teas/7"], path: "/teas", aim: "/teas/7", win: (hit) => hit.method === "GET" && hit.path === "/teas/7" && hit.status === 200 }),
      beat({
        goal: "25",
        kind: "read",
        receipt: { name: "Ginger", price: 25, id: 7 },
        pick: ["price"],
        win: () => false,
      }),
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
      beat({ goal: "Teas", lock: true, kind: "predict", path: "/teas", paths: ["/teas"], win: (hit) => hit.guess === 200 && hit.status === 200 }),
      post("Asha", { lock: true, kind: "predict", win: (hit) => hit.guess === 201 && hit.status === 201 }),
      post("Qty", {
        lock: true,
        kind: "predict",
        body: `{
  "tea_id": 12,
  "name": "Asha"
}`,
        win: (hit) => hit.guess === 400 && hit.status === 400,
      }),
      post("Pass", { lock: true, kind: "predict", auth: false, win: (hit) => hit.guess === 401 && hit.status === 401 }),
      beat({ goal: "#99", lock: true, kind: "predict", path: "/teas/99", paths: ["/teas/99"], win: (hit) => hit.guess === 404 && hit.status === 404 }),
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
        aim: "/teas",
        win: (hit) => hit.method === "GET" && hit.path === "/teas" && hit.status === 200,
      }),
      post("", { showCode: true, auth: false, json: false, win: (hit) => hit.auth && hit.json && typeof hit.body?.qty === "number" && hit.status === 201 }),
      beat({
        goal: "Asha",
        kind: "blanks",
        methods: ["POST"],
        method: "POST",
        paths: ["/orders"],
        path: "/orders",
        win: () => false,
      }),
      post("400", {
        lock: true,
        body: `{
  "tea_id": 12,
  "name": "Asha"
}`,
        win: (hit) => hit.status === 400 && hit.body?.qty === undefined,
      }),
      beat({
        goal: "field",
        kind: "read",
        receipt: { field: "qty", error: "MISSING_FIELD" },
        pick: ["field"],
        win: () => false,
      }),
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
        aim: "/orders",
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
  "days": 3,
  "name": "Asha"
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
        body: `{
  "lantern_id": 2,
  "days": "",
  "name": "Ravi"
}`,
        win: (hit) => hit.path === "/rentals" && hit.status === 201 && hit.body?.lantern_id === 2 && hit.body?.days === 2,
      }),
    ],
  },
];

const ISLANDS = ["Chai Port", "Keygate", "Tidewall", "Echo Market", "Oracle Steps", "Whisper Loft", "Glass Archive", "Lighthouse"];

function dockName(path: string) {
  if (path === "/tea") return "tea";
  if (path === "/teas") return "teas";
  if (path === "/orders") return "orders";
  if (path === "/orders/A42") return "A42";
  if (path === "/order") return "order";
  if (path === "/kettle") return "kettle";
  if (path === "/lanterns") return "lanterns";
  if (path === "/rentals") return "rentals";
  const jar = path.split("/")[2];
  return jar ? `#${jar}` : path || "/";
}

function league(stage: number) {
  if (stage >= 6) return "Gold";
  if (stage >= 3) return "Silver";
  return "Bronze";
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

  const nextPlay = mission.stage >= 7 ? "/win" : `/play/${mission.stage + 1}`;
  const nextName = mission.stage >= 7 ? "Courier" : STAGES[mission.stage].name;

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
        <main className="title-screen">
          <img src="/art/port-night.jpg" alt="" />
          <div className="veil" />
          <div className="title-copy">
            <p className="kicker">Relay Isles</p>
            <h1>DevQuest</h1>
            <a className="arena-go" href="/map" onClick={(event) => click(event, "/map", go)}>{mission.stage === 0 ? "Press Start" : "Continue"}</a>
            <span className="title-map">{league(mission.stage)} · {mission.xp}</span>
          </div>
        </main>
      )}

      {path === "/map" && (
        <main className="map worldmap">
          {ISLANDS.map((name, index) => {
            const mobile = window.matchMedia && window.matchMedia("(max-width: 520px)").matches;
            const spots = mobile
              ? [["14%","60%"],["38%","72%"],["62%","86%"],["78%","76%"],["22%","40%"],["50%","26%"],["78%","56%"],["70%","14%"]]
              : [["18%","66%"],["38%","50%"],["54%","76%"],["76%","44%"],["24%","30%"],["44%","14%"],["66%","60%"],["64%","10%"]];
            const spot = spots[index];
            return index === 0 ? (
              <button key={name} className="isle open" style={{ left: spot[0], top: spot[1] }} onClick={() => go(mission.stage >= 7 ? "/win" : "/mission")}>
                <i />
                <b>{name}</b>
              </button>
            ) : (
              <article key={name} className="isle shut" style={{ left: spot[0], top: spot[1] }}><i /><b>{name}</b></article>
            );
          })}
        </main>
      )}

      {path === "/mission" && mission.stage < 7 && (
        <main className="title-screen">
          <img src="/art/port-day.jpg" alt="" />
          <div className="veil" />
          <div className="title-copy">
            <p className="kicker">Chai Port</p>
            <h1>{nextName}</h1>
            <a className="arena-go" href={nextPlay} onClick={(event) => click(event, nextPlay, go)}>Dispatch</a>
          </div>
        </main>
      )}

      {playing >= 0 && playing <= mission.stage && (
        <StagePlay key={playing} index={playing} onWin={() => finish(playing)} />
      )}

      {path === "/win" && mission.stage >= 7 && (
        <main className="brief end">
          <img src="/art/port-night.jpg" alt="" />
          <p className="kicker">★ ★ ★</p>
          <h1>Courier</h1>
          <b>{mission.xp}</b>
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
  const [book, setBook] = useState<number[]>([]);
  const [fills, setFills] = useState<string[]>(["", "", "", ""]);
  const [status, setStatus] = useState(0);
  const [reply, setReply] = useState<unknown>(null);
  const [flying, setFlying] = useState(false);
  const [shake, setShake] = useState(false);
  const [hearts, setHearts] = useState(3);

  useEffect(() => {
    setMethod(spec.method);
    setResource(spec.path);
    setAuth(spec.auth);
    setJsonOn(spec.json);
    setKettle(spec.kettle);
    setBodyText(spec.body);
    setGuess(0);
    setPicked([]);
    setBook([]);
    setFills(["", "", "", ""]);
    setStatus(0);
    setReply(null);
    setFlying(false);
    setHearts(3);
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
    setHearts((value) => Math.max(1, value - 1));
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
    if (spec.kind === "blanks" && fills.some((word) => !word)) return;
    const blank = spec.kind === "blanks";
    const call = blank
        ? { method: (fills[0] === "post" ? "POST" : "GET") as Verb, path: "/orders", auth: fills[1] === "PASS", json: fills[2] === "application/json", kettle: false, body: { tea_id: 12, qty: fills[3] === "2" ? 2 : fills[3], name: "Asha" } as Record<string, unknown> }
      : { method, path: resource || "/", auth, json: jsonOn, kettle, body: parsed };
    setFlying(true);
    const hitBase = { method: call.method, path: call.path, auth: call.auth, json: call.json, kettle: call.kettle, body: call.body, guess };
    let won = false;
    try {
      const result = await relay(call.method, call.path, { auth: call.auth, json: call.json, body: call.body, kettle: call.kettle });
      const hit = { ...hitBase, status: result.status };
      setStatus(result.status);
      setReply(result.body);
      if (spec.kind === "album") {
        const need = [200, 201, 400, 401, 404, 500];
        const next = book.includes(result.status) ? book : [...book, result.status];
        setBook(next);
        if (need.every((code) => next.includes(code))) {
          won = true;
          window.setTimeout(() => advance(), 900);
        } else if (book.includes(result.status)) miss();
      } else if (spec.kind === "blanks") {
        const good = fills[0] === "post" && fills[1] === "PASS" && fills[2] === "application/json" && fills[3] === "2" && result.status === 201;
        if (good) {
          won = true;
          window.setTimeout(() => advance(), 1200);
        } else miss();
      } else if (spec.win(hit)) {
        won = true;
        window.setTimeout(() => advance(), 2000);
      } else miss();
    } catch {
      miss();
    } finally {
      if (!won) setFlying(false);
    }
  }

  const slip = `chai.${method === "GET" ? "get" : "post"}("${resource}")`;
  const crates = cargoOf(reply);
  const slots = spec.showBody ? slotsOf(bodyText) : [];
  const missed = status >= 400 && !flying;
  const dockHint = missed && spec.aim && spec.aim !== resource ? spec.aim : "";
  const verbHint = missed && method !== spec.method ? spec.method : "";
  const passHint = missed && status === 401;
  const jsonHint = missed && status === 400 && spec.showJson && !jsonOn;
  const hotHint = missed && status === 500 && spec.showKettle;
  const qtyHint = missed && status === 400 && slots.some((slot) => (slot.key === "qty" || slot.key === "days") && Number.isNaN(Number(slot.value === "" ? "x" : slot.value)));
  const goHint = !flying && (status === 0 || missed) && (spec.kind !== "predict" || guess > 0);

  function poke(key: string) {
    try {
      const data = JSON.parse(bodyText) as Record<string, unknown>;
      if (key === "qty") data.qty = 2;
      if (key === "note") data.note = "less sugar";
      if (key === "days") data.days = 2;
      setBodyText(JSON.stringify(data, null, 2));
    } catch {
      miss();
    }
  }

  return (
    <section className={`stage ${shake ? "shake" : ""}`}>
      <div className={`sky ${spec.base === "lanterns.isle" ? "night" : ""}`}>
        <div className="sea" aria-hidden="true"><i /><i /><i /></div>
        <div className="hearts" aria-label={`${hearts} lives`}>{[0, 1, 2].map((heart) => <span key={heart} className={heart < hearts ? "on" : ""}>♥</span>)}</div>
        <div className="quest"><small>{stage.name}</small><b>{spec.goal}</b></div>
        {flying && status > 0 && status < 400 && <div className="xp-pop">+{stage.name}</div>}
        <div className={`parcel ${flying ? "fly" : missed ? "back" : ""}`}>
          {spec.goal && <b>{spec.goal}</b>}
          <em>{method} {resource || "/"}</em>
          {spec.showCode && <code>{slip}</code>}
          {spec.kind === "blanks" && (
            <div className="slots">
              {fills.map((word, index) => (
                <button key={index} type="button" onClick={() => setFills((prev) => prev.map((item, slot) => slot === index ? "" : item))}>{word || "·"}</button>
              ))}
            </div>
          )}
          {spec.kind !== "blanks" && slots.length > 0 && (
            <div className="slots">
              {slots.map((slot) => (
                <button key={slot.key} type="button" disabled={spec.lock} className={qtyHint && slot.key === "qty" ? "hint" : ""} onClick={() => poke(slot.key)}>{slot.key} {slot.value || "·"}</button>
              ))}
            </div>
          )}
        </div>
        {status > 0 && (
          <div className={`seal ${status >= 500 ? "bad" : status >= 400 ? "warn" : "ok"}`}>{status}</div>
        )}
        {spec.kind === "album" && (
          <div className="book">
            {[200, 201, 400, 401, 404, 500].map((code) => (
              <span key={code} className={book.includes(code) ? "got" : ""}>{book.includes(code) ? code : ""}</span>
            ))}
          </div>
        )}
        {spec.kind !== "read" && (
          <div className="docks">
            {spec.paths.map((item) => (
              <button key={item} type="button" disabled={spec.lock} className={resource === item ? "on" : dockHint === item ? "hint" : ""} onClick={() => setResource(item)}>
                <b>{dockName(item)}</b>
                <span>{item}</span>
              </button>
            ))}
          </div>
        )}
        <div className="stage-cargo">
          <div className="cargo">
            {crates.map((item) => (
              <article key={item.title + item.meta}><b>{item.title}</b>{item.meta && <span>{item.meta}</span>}</article>
            ))}
          </div>
          {spec.kind === "read" && spec.receipt && (
            <div className="cargo">
              {Object.entries(spec.receipt).map(([key, value]) => (
                <button key={key} className={picked.includes(key) ? "on" : picked.some((item) => !(spec.pick ?? []).includes(item)) && (spec.pick ?? []).includes(key) ? "hint" : ""} onClick={() => {
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
        <form className="hud" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          {spec.kind === "blanks" && (
            <div className="verb-keys">
              {["get", "post", "PASS", "application/json", "2", "two"].map((word) => (
                <button key={word} type="button" className="key" onClick={() => setFills((prev) => {
                  const slot = prev.indexOf("");
                  if (slot < 0) return prev;
                  return prev.map((item, index) => index === slot ? word : item);
                })}>{word}</button>
              ))}
            </div>
          )}
          {spec.kind !== "blanks" && <div className="verb-keys">
            {spec.methods.map((verb) => (
              <button key={verb} type="button" className={`key ${method === verb ? "on" : ""} ${verbHint === verb ? "hint" : ""}`} disabled={spec.lock} onClick={() => setMethod(verb)}>{verb}</button>
            ))}
          </div>}
          {spec.showAuth && <button type="button" className={`key ${auth ? "on" : ""} ${passHint ? "hint" : ""}`} disabled={spec.lock} onClick={() => setAuth((value) => !value)}>PASS</button>}
          {spec.showJson && <button type="button" className={`key ${jsonOn ? "on" : ""} ${jsonHint ? "hint" : ""}`} disabled={spec.lock} onClick={() => setJsonOn((value) => !value)}>JSON</button>}
          {spec.showKettle && <button type="button" className={`key ${kettle ? "on" : ""} ${hotHint ? "hint" : ""}`} onClick={() => setKettle((value) => !value)}>HOT</button>}
          {spec.kind === "predict" && spec.choices.map((code) => (
            <button key={code} type="button" className={`key ${guess === code ? "on" : ""} ${!guess ? "hint" : ""}`} onClick={() => setGuess(code)}>{code}</button>
          ))}
          <button className={`btn amber big${goHint ? " pulse" : ""}`} type="submit" disabled={flying || (spec.kind === "predict" && !guess) || (spec.kind === "blanks" && fills.some((word) => !word))}>Dispatch</button>
        </form>
        )}
      </div>
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
    if (typeof row.field === "string") return [{ title: row.field, meta: "" }];
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
