import { useCallback, useEffect, useRef, useState } from "react";
import { chooseCity, clearLevel, getPlayer, migrate, resetShelf, saveTheme, sendShelf, type Save } from "./api";

type Skin = {
  id: string;
  hero: string;
  place: string;
  one: string;
  many: string;
  n: string;
  light: string;
  owner: string;
};

const SKINS: Skin[] = [
  { id: "market", hero: "Mahesh", place: "Market", one: "stall", many: "stalls", n: "17", light: "lamp", owner: "Isha" },
  { id: "clinic", hero: "Anika", place: "Clinic", one: "shelf", many: "shelves", n: "9", light: "stock", owner: "Sen" },
  { id: "dock", hero: "Rafi", place: "Harbor", one: "crate", many: "crates", n: "4", light: "seal", owner: "Oka" },
  { id: "bay", hero: "Leela", place: "Bay", one: "bay", many: "bays", n: "2", light: "light", owner: "Nova" },
];

const LEVELS = [
  { name: "Path", xp: 20, word: "PATH", goal: (s: Skin) => `Only ${s.n}` },
  { name: "Look", xp: 20, word: "GET", goal: () => "Name stays" },
  { name: "Tweak", xp: 25, word: "PATCH", goal: (s: Skin) => `${s.light} off` },
  { name: "Miss", xp: 20, word: "404", goal: () => "Both stamps" },
  { name: "Card", xp: 25, word: "JSON", goal: () => "Fill the card" },
  { name: "Make", xp: 20, word: "POST", goal: () => "Make one" },
  { name: "Boss", xp: 40, word: "REST", goal: () => "3 orders" },
];

type Card = { id: string; owner: string; on: boolean };
type World = { shelf: Card[]; inbox: Card[]; stamp: string };
type Verb = "GET" | "POST" | "PUT" | "PATCH";

const KEY = "dq-relay-play-v3";

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { skin: "", cleared: 0, xp: 0, words: [], theme: "dark" };
    return { skin: "", cleared: 0, xp: 0, words: [], theme: "dark", ...JSON.parse(raw) };
  } catch {
    return { skin: "", cleared: 0, xp: 0, words: [], theme: "dark" };
  }
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

function fresh(skin: Skin): World {
  return {
    shelf: [
      { id: "03", owner: "Rin", on: false },
      { id: skin.n, owner: skin.owner, on: true },
      { id: "21", owner: "Sol", on: true },
    ],
    inbox: [],
    stamp: "",
  };
}

function apply(world: World, verb: Verb, target: string, jam: boolean, skin: Skin): World {
  if (jam) return { ...world, inbox: [], stamp: "500" };
  if (verb === "GET" && target === "all") return { ...world, inbox: world.shelf.map((c) => ({ ...c })), stamp: "200" };
  if (verb === "GET" && (target === "99" || target === "new")) return { ...world, inbox: [], stamp: "404" };
  if (verb === "POST") {
    if (target === "all" || target === "new") {
      const made = { id: "8", owner: skin.owner, on: true };
      return { shelf: [...world.shelf, made], inbox: [made], stamp: "201" };
    }
    return { ...world, inbox: [], stamp: "" };
  }
  const card = world.shelf.find((c) => c.id === target);
  if (!card) return { ...world, inbox: [], stamp: "404" };
  if (verb === "GET") return { ...world, inbox: [{ ...card }], stamp: "200" };
  if (verb === "PUT") {
    const next = { id: card.id, owner: "", on: false };
    return { shelf: world.shelf.map((c) => (c.id === card.id ? next : c)), inbox: [next], stamp: "200" };
  }
  const next = { ...card, on: false };
  return { shelf: world.shelf.map((c) => (c.id === card.id ? next : c)), inbox: [next], stamp: "200" };
}

export function RelayGame() {
  const [boot] = useState(load);
  const [save, setSave] = useState<Save>(boot);
  const [known, setKnown] = useState(false);
  const [pop, setPop] = useState("");
  const touched = useRef(false);
  const { path, go } = useRoute();
  const levelNo = /^\/play\/([1-7])$/.exec(path);
  const playing = levelNo ? Number(levelNo[1]) - 1 : -1;
  const continueHref = !save.skin ? "/city" : save.cleared >= LEVELS.length ? "/win" : `/play/${save.cleared + 1}`;

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(save));
    document.documentElement.dataset.theme = save.theme;
  }, [save]);

  useEffect(() => {
    let live = true;
    const local = load();
    void (async () => {
      try {
        let remote = await getPlayer();
        if (!touched.current && !remote.skin && remote.cleared === 0 && remote.xp === 0 && (local.skin || local.xp || local.cleared)) {
          remote = await migrate(local);
        }
        if (!live || touched.current) return;
        setSave(remote);
      } catch {
        /* this browser keeps the last round if the API is down */
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
    const knownPage = path === "/home" || path === "/city" || path === "/win" || playing >= 0;
    if (!knownPage) {
      go("/home", true);
      return;
    }
    if ((playing >= 0 || path === "/win") && !save.skin) {
      go("/city", true);
      return;
    }
    if (playing > save.cleared) {
      go(`/play/${save.cleared + 1}`, true);
      return;
    }
    if (path === "/win" && save.cleared < LEVELS.length) {
      go(`/play/${save.cleared + 1}`, true);
    }
  }, [path, playing, save.skin, save.cleared, known, go]);

  useEffect(() => {
    document.title = "DevQuest";
  }, []);

  useEffect(() => {
    if (!pop) return;
    const t = window.setTimeout(() => setPop(""), 800);
    return () => window.clearTimeout(t);
  }, [pop]);

  const skin = SKINS.find((s) => s.id === save.skin) ?? SKINS[0];

  function finish(index: number) {
    touched.current = true;
    const first = index === save.cleared;
    setSave((s) => {
      const word = LEVELS[index].word;
      return {
        ...s,
        cleared: Math.max(s.cleared, index + 1),
        xp: s.xp + (index === s.cleared ? LEVELS[index].xp : 0),
        words: s.words.includes(word) ? s.words : [...s.words, word],
      };
    });
    setPop(first ? `+${LEVELS[index].xp}` : "");
    go(index + 1 >= LEVELS.length ? "/win" : `/play/${index + 2}`);
    void clearLevel(index)
      .then((remote) => setSave({ skin: remote.skin, cleared: remote.cleared, xp: remote.xp, words: remote.words, theme: remote.theme }))
      .catch(() => {});
  }

  function click(event: { preventDefault(): void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number }, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    go(href);
  }

  const playOk = playing >= 0 && Boolean(save.skin) && playing <= save.cleared;
  const winOk = path === "/win" && Boolean(save.skin) && save.cleared >= LEVELS.length;

  return (
    <div className="arena-app">
      {(path === "/" || path === "/home") && (
        <main className="gate">
          <a className="town-go" href={continueHref} aria-label="Play" onClick={(event) => click(event, continueHref)}>
            <span className="mini-town big-town"><i /><i /><i /></span>
          </a>
          <a className="swatches" href="/city" aria-label="Cities" onClick={(event) => click(event, "/city")}>
            <i data-skin="market" /><i data-skin="clinic" /><i data-skin="dock" /><i data-skin="bay" />
          </a>
        </main>
      )}
      {path === "/city" && (
        <main className="gate">
          <div className="cast-grid">
            {SKINS.map((s) => (
              <button key={s.id} className="city-pick" data-skin={s.id} aria-label={s.place} onClick={() => {
                touched.current = true;
                void chooseCity(s.id).then((next) => {
                  setSave(next);
                  go("/play/1");
                }).catch(() => {
                  setSave((prev) => ({ ...prev, skin: s.id, cleared: 0, xp: 0, words: [] }));
                  go("/play/1");
                });
              }}>
                <span className="mini-town"><i /><i /><i /></span>
              </button>
            ))}
          </div>
          <a className="btn ghost" href="/home" aria-label="Home" onClick={(event) => click(event, "/home")}>←</a>
        </main>
      )}
      {(playOk || winOk) && (
        <header className="g-top">
          <a className="brand" href="/home" aria-label="Home" onClick={(event) => click(event, "/home")}><span className="mini-town"><i /><i /><i /></span></a>
          <div className="pips">
            {LEVELS.map((level, i) => (
              i > save.cleared ? (
                <span key={level.name} className="pip locked">{i + 1}</span>
              ) : (
                <a key={level.name} className={`pip ${i < save.cleared ? "done" : ""} ${playOk && i === playing ? "now" : ""}`} href={`/play/${i + 1}`} onClick={(event) => click(event, `/play/${i + 1}`)}>
                  {i < save.cleared ? "★" : i + 1}
                </a>
              )
            ))}
            <span className="pip locked">8</span>
          </div>
          <div className="g-xp" aria-label={`${save.xp} XP`}><span style={{ width: `${Math.min(100, (save.xp / 170) * 100)}%` }} /></div>
          <button className="btn small ghost" aria-label={save.theme === "dark" ? "Light" : "Dark"} onClick={() => {
            touched.current = true;
            const theme = save.theme === "dark" ? "light" : "dark";
            setSave((s) => ({ ...s, theme }));
            void saveTheme(theme).catch(() => {});
          }}>{save.theme === "dark" ? "☀" : "☾"}</button>
        </header>
      )}
      {playOk && (
        <Run key={`${skin.id}-${playing}`} index={playing} skin={skin} onWin={() => finish(playing)} />
      )}
      {winOk && (
        <main className="gate">
          <div className="chips">{save.words.map((w) => <span key={w} className="chip">{w}</span>)}</div>
          <div className="row">
            <a className="btn primary" href="/play/1" aria-label="Replay" onClick={(event) => click(event, "/play/1")}>↺</a>
            <a className="btn ghost" href="/city" aria-label="Cities" onClick={(event) => { touched.current = true; setSave((s) => ({ ...s, skin: "", cleared: 0, xp: 0, words: [] })); void chooseCity("").catch(() => {}); click(event, "/city"); }}><span className="mini-town"><i /><i /><i /></span></a>
          </div>
        </main>
      )}
      {pop && <div className="xp-pop">{pop}</div>}
    </div>
  );
}

function Run({ index, skin, onWin }: { index: number; skin: Skin; onWin: () => void }) {
  const [world, setWorld] = useState<World>(() => (index === 5 ? { shelf: [], inbox: [], stamp: "" } : fresh(skin)));
  const [verb, setVerb] = useState<Verb | "">(index === 0 || index === 3 ? "GET" : "");
  const [target, setTarget] = useState(index === 1 || index === 2 ? skin.n : index === 5 ? "new" : "");
  const [jam, setJam] = useState(false);
  const [flying, setFlying] = useState(false);
  const [won, setWon] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [scribble, setScribble] = useState(false);
  const [order, setOrder] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [shake, setShake] = useState(false);
  const [live, setLive] = useState(false);

  const verbs: Verb[] =
    index === 0 || index === 3 ? ["GET"] :
    index === 1 ? ["GET", "PUT"] :
    index === 2 ? ["PUT", "PATCH"] :
    index === 5 ? ["GET", "POST"] :
    index === 6 ? ["GET", "POST", "PUT", "PATCH"] : [];

  const lockTarget = index === 1 || index === 2 || index === 5;
  const showAll = index === 0 || index === 6;

  const lock = useRef(false);

  useEffect(() => {
    let stop = false;
    void resetShelf(index === 5)
      .then((next) => { if (!stop) setWorld(next); })
      .catch(() => {})
      .finally(() => { if (!stop) setLive(true); });
    return () => { stop = true; };
  }, [index, skin.id]);

  async function fire() {
    if (lock.current || won || !verb || !target || !live) return;
    lock.current = true;
    setFlying(true);
    const started = Date.now();
    let next: World;
    try {
      next = await sendShelf(verb, target, jam, skin.light);
    } catch {
      next = apply(world, verb, target, jam, skin);
    }
    window.setTimeout(() => {
      lock.current = false;
      setFlying(false);
      const bag = next.stamp && !seen.includes(next.stamp) ? [...seen, next.stamp] : seen;
      setSeen(bag);
      const ok = didWin(index, verb, target, next, skin, bag, order);
      if (index === 6) {
        if (ok) {
          if (order === 2) {
            setWorld(next);
            setWon(true);
          } else {
            setOrder((n) => n + 1);
            setVerb("");
            setTarget("");
            void resetShelf(false).then(setWorld).catch(() => setWorld(fresh(skin)));
          }
        } else {
          bump();
          const left = hearts - 1;
          if (left <= 0) {
            setHearts(3);
            setOrder(0);
            void resetShelf(false).then(setWorld).catch(() => setWorld(fresh(skin)));
          } else {
            setHearts(left);
            setWorld(next);
          }
          setVerb("");
          setTarget("");
        }
        return;
      }
      setWorld(next);
      if (ok) setWon(true);
      else if ((index === 1 && verb === "PUT") || (index === 2 && verb === "PUT") || (index === 0 && target === "all")) bump();
    }, Math.max(0, 380 - (Date.now() - started)));
  }

  function bump() {
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  }

  function reset() {
    setWon(false);
    setShake(false);
    setSeen([]);
    if (!(index === 1 || index === 2)) setTarget(index === 5 ? "new" : "");
    void resetShelf(index === 5).then(setWorld).catch(() => setWorld(index === 5 ? { shelf: [], inbox: [], stamp: "" } : fresh(skin)));
  }

  const cmd = command(verb, target, skin);

  return (
    <section className={`split ${shake ? "shake" : ""}`} data-skin={skin.id}>
      <div className="pond">
        <div className="lane">
          <div className="inbox" aria-label="Came back">
            {world.inbox.length === 0 && world.stamp === "404" && <div className="door ghost">404</div>}
            {world.inbox.length === 0 && world.stamp === "500" && <div className="door ghost bad">500</div>}
            {world.inbox.map((c) => <Mini key={c.id + c.owner + c.on} card={c} />)}
          </div>
          <div className={`wire ${flying ? "fly" : ""}`} aria-hidden="true"><i /></div>
          <div className="shelf">
            {index === 5 && world.shelf.length === 0 && <div className="door ghost">+</div>}
            {world.shelf.map((c) => (
              <button key={c.id} className={`door ${target === c.id ? "active" : ""} ${c.on ? "lit" : ""} ${index === 0 && c.id === skin.n ? "hint" : ""}`} disabled={lockTarget || index === 4} onClick={() => setTarget(c.id)}>
                <i className="lamp" />
                <b>{c.id}</b>
                <em className={c.owner ? "" : "gone"}>{c.owner || "—"}</em>
              </button>
            ))}
            {showAll && (
              <button className={`door wide ${target === "all" ? "active" : ""}`} onClick={() => setTarget("all")}>ALL</button>
            )}
            {index === 3 && (
              <button className={`door ghost ${target === "99" ? "active" : ""}`} onClick={() => setTarget("99")}>99</button>
            )}
          </div>
        </div>
        {world.stamp && <div className={`stamp-pop s${world.stamp}`} aria-live="polite">{world.stamp}</div>}
        {index === 3 && (
          <div className="badges">
            <span className={seen.includes("404") ? "on" : ""}>404</span>
            <span className={seen.includes("500") ? "on" : ""}>500</span>
          </div>
        )}
        {index === 4 && <Reader slots={slots} scribble={scribble} full={slots.length === 3 && !scribble} />}
        {index === 6 && (
          <div className="orders" aria-label={`Order ${order + 1}, ${hearts} lives`}>
            {["1", "2", "3"].map((n, i) => <span key={n} className={i < order ? "on" : i === order ? "now" : ""}>{n}</span>)}
            <span className="lives">{"♥".repeat(hearts)}{"♡".repeat(3 - hearts)}</span>
          </div>
        )}
      </div>
      <div className="dock">
        {index === 4 ? (
          <div className="stack">
            <div className="row">
              {[skin.n, skin.light, skin.owner].map((token) => (
                <button key={token} className="btn" disabled={slots.includes(token) || scribble} onClick={() => setSlots((s) => [...s, token])}>{token}</button>
              ))}
            </div>
            <button className="btn ghost" onClick={() => { setScribble(true); setSlots([]); }}>~~~</button>
            {scribble && <button className="btn ghost" aria-label="Reset" onClick={() => setScribble(false)}>↺</button>}
            <button className="btn amber big" aria-label="Next" disabled={slots.length < 3 || scribble} onClick={onWin}>▶</button>
          </div>
        ) : (
          <>
            <code className="cmd">{cmd || "·"}</code>
            {index === 2 && <code className="cmd dim">{`{ "${skin.light}": false }`}</code>}
            <div className="verb-keys">
              {verbs.map((v) => (
                <button key={v} className={`key ${verb === v ? "on" : ""}`} onClick={() => setVerb(v)}>{v}</button>
              ))}
            </div>
            {index === 3 && (
              <button className={`key ${jam ? "on" : ""}`} onClick={() => setJam((j) => !j)}>JAM</button>
            )}
            <div className="row">
              {!won && <button className="btn ghost" onClick={reset}>↺</button>}
              {won ? <button className="btn amber big" aria-label="Next" onClick={onWin}>▶</button> : <button className="btn primary big" aria-label="Send" disabled={!verb || !target || flying || !live} onClick={() => void fire()}>▶</button>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function didWin(index: number, verb: Verb | "", target: string, world: World, skin: Skin, seen: string[], order: number) {
  const card = world.shelf.find((c) => c.id === skin.n);
  if (index === 0) return verb === "GET" && target === skin.n && world.inbox.length === 1;
  if (index === 1) return verb === "GET" && card?.owner === skin.owner && world.inbox.length === 1;
  if (index === 2) return verb === "PATCH" && card?.on === false && card.owner === skin.owner;
  if (index === 3) return seen.includes("404") && seen.includes("500");
  if (index === 5) return world.stamp === "201";
  if (index === 6) {
    if (order === 0) return verb === "GET" && target === skin.n && world.inbox.length === 1;
    if (order === 1) return verb === "POST" && world.stamp === "201";
    return verb === "PATCH" && target === skin.n && !!world.shelf.find((c) => c.id === skin.n && c.owner === skin.owner && !c.on);
  }
  return false;
}

function command(verb: Verb | "", target: string, skin: Skin) {
  if (!verb && !target) return "";
  const path = !target ? `/${skin.many}/` : target === "all" || target === "new" ? `/${skin.many}` : `/${skin.many}/${target}`;
  return `${verb || "···"} ${path}`;
}

function Mini({ card }: { card: Card }) {
  return <div className={`door mini ${card.on ? "lit" : ""}`}><b>{card.id}</b><em className={card.owner ? "" : "gone"}>{card.owner || "—"}</em></div>;
}

function Reader({ slots, scribble, full }: { slots: string[]; scribble: boolean; full: boolean }) {
  return (
    <div className={`reader ${scribble ? "shake" : ""} ${full ? "fed" : ""}`}>
      {[0, 1, 2].map((i) => <div key={i} className="socket">{slots[i] ?? ""}</div>)}
    </div>
  );
}
