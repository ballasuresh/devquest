import { useEffect, useMemo, useState } from "react";

const SAVE = "dq-m35";
const LINE = ["Your", "order", "is", "on", "the", "way."];
const RIBBON = ["Open", "Discover", "Explore", "Assign", "Predict", "Code", "Debug", "Boss"] as const;
const FLOW: StageId[] = ["open", "discover", "explore", "assign", "predict", "code", "debug", "boss", "win"];

type StageId = "pick" | "open" | "discover" | "explore" | "assign" | "predict" | "code" | "debug" | "boss" | "win";

type Progress = {
  avatar: string;
  stage: StageId;
  theme: "dark" | "light";
  ai: boolean;
  clues: string[];
  asked: boolean;
  explore: number;
  checks: boolean[];
  recap1: boolean;
  recap2: boolean;
  chats: string[];
  preds: number[];
  blanks: string[];
  guided: boolean[];
  bugs: boolean[];
  shield: number;
  hearts: number;
  phase: number;
  xp: number;
  reached: number;
};

const AVATARS = [
  { id: "Tanvi", role: "CSE · reads the chunk logs" },
  { id: "Rohan", role: "ECE · narrates the wire" },
  { id: "Samar", role: "Mechanical · pipes and valves" },
  { id: "Sana", role: "Civil · decides what done means" },
];

const CLUES = [
  { id: "cursor", title: "Blinking cursor", body: "Text stopped. Nothing said the reply finished.", line: "Rain stopped play. The scoreboard still says match won." },
  { id: "tick", title: "Green tick", body: "Ila's board says delivered because some words came out.", line: "A bridge at 80% is a diving board." },
  { id: "dump", title: "The slow bot", body: "Without streaming, the customer stares at a spinner, then gets the whole reply at once.", line: "A next-day match report, not ball-by-ball." },
  { id: "usage", title: "Token meter", body: "Usage never arrived. The scorecard is still blank.", line: "No scorecard means the over might not be over." },
];

const STEPS = [
  {
    id: "E1",
    title: "Why stream at all?",
    analogy: "Live commentary, not the next-day match report.",
    watch: "The spinner bot waits, then dumps the sentence. The stream bot shows the first word almost at once.",
    poke: "Drag the reply longer. The wait before the first word only grows for the spinner bot.",
    q: "Why do support bots stream?",
    options: ["It makes the model smarter.", "Customers see the reply start right away.", "It uses fewer tokens."],
    answer: 1,
    why: "The first words show up while the model is still writing.",
  },
  {
    id: "E2",
    title: "What travels on the wire",
    analogy: "Each ball is one line of commentary.",
    watch: "Each event is a data: line, then a blank line. Lines starting with : are keep-alives. The stream ends with data: [DONE].",
    poke: "A keep-alive comment sits in the lane. The parser skips it. Only data: lines become chunks.",
    q: "Which line means the stream is over?",
    options: ["a blank line", ": keep-alive", "data: [DONE]"],
    answer: 2,
    why: "[DONE] is the sentinel. Blank lines only separate events.",
  },
  {
    id: "E3",
    title: "Inside one chunk",
    analogy: "Not every line of commentary is a run.",
    watch: "Role-only chunks have no content. Usage chunks have no choices. Text lives at choices[0].delta.content.",
    poke: "Tap the usage chunk and choices[0] throws. Skip chunks with no choices, then use .get('content').",
    q: "delta is {role: assistant}. What does delta.get('content') give?",
    options: ['""', "None", "KeyError"],
    answer: 1,
    why: ".get() returns None when the key is missing. It does not crash, and it is not an empty string.",
  },
  {
    id: "E4",
    title: "Show it live",
    analogy: "Read each line the moment it comes in.",
    watch: 'print(piece, end="", flush=True) paints one line as the words arrive.',
    poke: "Flush off. The terminal holds the buffer, then dumps the whole reply. That is the frozen chat from Discovery.",
    q: "Without flush=True, what does a terminal show?",
    options: ["each word on a new line", "nothing for a while, then the whole reply", "an error"],
    answer: 1,
    why: "end='' never prints a newline, so the line stays buffered until the end.",
  },
  {
    id: "E5",
    title: "Assemble the full reply",
    analogy: "The commentary log becomes the match report.",
    watch: "Each piece goes into a list. ''.join(parts) builds the reply for history.",
    poke: "Loop the same stream twice. The second loop is empty. A stream can be read only once.",
    q: "You print every chunk, then loop the stream again to build the text. What is the text?",
    options: ["the full reply", "an empty string", "the reply twice"],
    answer: 1,
    why: "Collect in the same pass that prints. The second pass gets nothing.",
  },
  {
    id: "E6",
    title: "Know when it is really done",
    analogy: "The umpire's signal, then the scorecard.",
    watch: 'The last content-free chunk carries finish_reason: stop or length. Usage rides after that, with empty choices.',
    poke: "Cut the stream early. No finish signal, no usage. The label is unfinished.",
    q: "Text stopped and no finish_reason came. Is the reply finished?",
    options: ["Yes, text stopped", "No. We cannot call it complete", "Yes, if it ends with a full stop"],
    answer: 1,
    why: "Quiet is not done. Only finish_reason says the match is over.",
  },
];

const CHATS = [
  {
    id: "refund",
    who: "Refund chat",
    seen: "Your order is on the ",
    event: "The stream went quiet. No finish signal.",
    right: "partial",
    tiles: [
      { id: "partial", label: "Keep text · mark partial" },
      { id: "good", label: "Mark all good" },
      { id: "hide", label: "Hide the silence" },
    ],
    miss: "The customer gets a green tick on half a sentence. That is how tonight started.",
  },
  {
    id: "dry",
    who: "Chat 2",
    seen: "Your order is ",
    event: "Error after some words. Connection reset.",
    right: "error",
    tiles: [
      { id: "error", label: "Keep text · mark error" },
      { id: "storm", label: "Retry forever" },
      { id: "good", label: "Mark all good" },
    ],
    miss: "A storm is retries with no patience. Keep what arrived and say it errored.",
  },
  {
    id: "early",
    who: "Chat 3",
    seen: "(no words yet)",
    event: "The error hit before any text.",
    right: "retry",
    tiles: [
      { id: "retry", label: "Wait, then retry once" },
      { id: "now", label: "Retry now" },
      { id: "good", label: "Mark all good" },
    ],
    miss: "Nothing was shown, so one retry after a pause will not duplicate text.",
  },
];

const PREDS = [
  {
    title: "Cleaner output",
    change: "Ila removed flush=True.",
    options: ["Words still appear one by one.", "The screen stays blank, then the whole sentence lands.", "Each word is on its own line.", "The bot crashes on the last chunk."],
    answer: 1,
    why: "No newline, so the terminal holds the line until the end. Tag: NO_FLUSH.",
  },
  {
    title: "Fewer checks",
    change: 'She prints chunk["choices"][0]["delta"]["content"] with no guard.',
    options: ["The full reply, slightly faster.", "The reply, then a crash at the end.", "Nothing. It crashes on the first chunk.", 'The word "None" before the reply.'],
    answer: 2,
    why: "The first chunk is role-only. ['content'] raises KeyError before a single word.",
  },
  {
    title: "Smarter status",
    change: 'status = "complete" if text else "failed", after the line goes quiet.',
    options: ['Half a sentence with a green Delivered tick.', "Half a sentence marked partial.", "An error instead of the text.", "The bot quietly finishes the sentence."],
    answer: 0,
    why: "Text exists, so her rule says complete. No finish_reason arrived. That is the All-Good lie.",
  },
  {
    title: "Save the reply",
    change: "She prints live, then loops the stream again to fill chat history.",
    options: ["The bot remembers its reply.", "The reply never shows.", "The reply shows, but memory saves an empty message.", "The reply shows twice."],
    answer: 2,
    why: "A stream can be read only once. The second loop stores an empty string.",
  },
  {
    title: "Never give up",
    change: 'while status != "complete": consume again, right now.',
    options: ["The bot says it will try later.", "One retry, then the reply arrives.", "The partial line repeats until the city is rate-limited.", "The loop runs once and stops."],
    answer: 2,
    why: "No cap, no pause, and each attempt reprints the partial text. That is a retry storm.",
  },
  {
    title: "Shorter replies",
    change: 'She set a tiny token limit. finish_reason is "length".',
    options: ["An error popup.", "The full reply. Limits only affect the prompt.", 'The line stops mid-sentence and the chat says truncated.', "The bot waits forever."],
    answer: 2,
    why: "A clean finish can still be cut short. Mission 3.6 is about these dials.",
  },
];

const BLANKS = [
  { slot: "usage key", answer: "usage", options: ["usage", "tokens", "score"] },
  { slot: "delta key", answer: "content", options: ["content", "text", "role"] },
  { slot: "end=", answer: '""', options: ['""', '"\\n"', '" "'] },
  { slot: "flush=", answer: "True", options: ["True", "False"] },
  { slot: "list method", answer: "append", options: ["append", "+="] },
  { slot: "join glue", answer: '""', options: ['""', '" "', '"[DONE]"'] },
];

const GUIDED = [
  { step: "Skip empty choices", check: "A usage-only chunk must not crash, and usage is stored.", ok: "Store usage, then continue." },
  { step: "Print live", check: "Only truthy pieces, with end='' and flush=True.", ok: "Flush every piece, on the same line." },
  { step: "Finish signal", check: "Save finish_reason when the chunk sets it.", ok: "That is the umpire, not the punctuation." },
  { step: "Honest status", check: "error, then stop, then length, else partial.", ok: "Decide after the loop, not before." },
];

const BUGS = [
  {
    name: "The None that broke the line",
    symptom: "Customer sees nothing. TypeError: NoneType on the first chunk.",
    fix: "Print and collect only when piece is truthy.",
    wrong: [
      { label: "text += str(piece)", line: "Now the log says None twice. Ila would frame that." },
      { label: "except TypeError: pass", line: "You hid the crash. The customer still has no answer." },
    ],
  },
  {
    name: "The frozen-looking screen",
    symptom: "Nothing, then the whole reply at once.",
    fix: 'print(piece, end="", flush=True)',
    wrong: [
      { label: "time.sleep(0.05)", line: "Slower isn't more live." },
      { label: "flush once after the loop", line: "Flush every piece, not at the funeral." },
    ],
  },
  {
    name: "The reply the bot forgot",
    symptom: "Live output looks perfect. History stores an empty reply.",
    fix: "Append each piece in the same loop that prints.",
    wrong: [
      { label: "Call the API again", line: "Paying twice for a reply you already had?" },
      { label: "list(stream) first", line: "You bought the whole match report. We wanted live commentary." },
    ],
  },
  {
    name: "The All-Good lie",
    symptom: "Cut-off and error chats both show Delivered on half a sentence.",
    fix: "Set status after the loop: error, stop, length, else partial.",
    wrong: [
      { label: 'complete if text else error', line: "Text existing isn't the same as text finishing." },
      { label: 'if text.endswith(".")', line: "Punctuation isn't a protocol." },
    ],
  },
  {
    name: "The missing scorecard",
    symptom: "The reply is perfect. Usage always shows ?.",
    fix: "Don't break on finish_reason. Usage arrives on the next chunk.",
    wrong: [
      { label: "Count the words", line: "Words aren't tokens. Close enough is how budgets explode." },
      { label: "Ask the API for usage again", line: "There's no refund for asking twice." },
    ],
  },
];

const BOSS = [
  {
    name: "Hold the Line",
    brief: "Five normal streams. Show every word live. Skip the throat-clear chunk.",
    right: "Show each word as it arrives, and skip the role-only chunk.",
    options: ["Show each word as it arrives, and skip the role-only chunk.", "Wait for the full reply, then dump it.", "Mark every chat all good."],
  },
  {
    name: "The Cut",
    brief: "One stream goes quiet. One errors before any text. One stops at finish_reason length.",
    right: "Partial, one retry after a pause, truncated.",
    options: ["Partial, one retry after a pause, truncated.", "All three are complete.", "Retry all three immediately."],
  },
  {
    name: "The All-Good Lie",
    brief: "Ila paints a green tick on every chat. Your Line Keeper is plugged in.",
    right: "Replace each tick with the true status and a usage line.",
    options: ["Replace each tick with the true status and a usage line.", "Keep the ticks. Customers want a feeling.", "Hide the board."],
  },
];

function fresh(): Progress {
  return {
    avatar: "",
    stage: "pick",
    theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
    ai: true,
    clues: [],
    asked: false,
    explore: 0,
    checks: STEPS.map(() => false),
    recap1: false,
    recap2: false,
    chats: [],
    preds: [],
    blanks: BLANKS.map(() => ""),
    guided: GUIDED.map(() => false),
    bugs: BUGS.map(() => false),
    shield: 100,
    hearts: 3,
    phase: 0,
    xp: 0,
    reached: 0,
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(SAVE);
    if (!raw) return fresh();
    const data = { ...fresh(), ...JSON.parse(raw) } as Progress;
    const at = FLOW.indexOf(data.stage);
    data.reached = Math.max(data.reached || 0, at < 0 ? 0 : at);
    return data;
  } catch {
    return fresh();
  }
}

function lineFill(stage: StageId, explore: number) {
  if (stage === "win" || stage === "boss" || stage === "debug" || stage === "code") return 6;
  if (stage === "predict" || stage === "assign") return 6;
  if (stage === "explore") return Math.min(6, explore);
  if (stage === "discover" || stage === "open") return 0;
  return 0;
}

export function Unfinished({ onMap, onNext }: { onMap?: () => void; onNext?: () => void }) {
  const [save, setSave] = useState<Progress>(load);
  const [note, setNote] = useState("A reply isn't done when it stops. It's done when it says it's done.");
  const [typed, setTyped] = useState("");
  const [playing, setPlaying] = useState(false);
  const [length, setLength] = useState(6);
  const [flush, setFlush] = useState(true);
  const [order, setOrder] = useState<string[]>([]);
  const [miss, setMiss] = useState("");
  const [temp, setTemp] = useState("0.7");
  const [tests, setTests] = useState<string[]>([]);
  const [bugNote, setBugNote] = useState("");
  const [confidence, setConfidence] = useState(1);

  useEffect(() => {
    localStorage.setItem(SAVE, JSON.stringify(save));
    document.documentElement.dataset.theme = save.theme;
  }, [save]);

  function patch(next: Partial<Progress>) {
    setSave((current) => ({ ...current, ...next }));
  }

  const at = FLOW.indexOf(save.stage);
  const filled = lineFill(save.stage, save.checks.filter(Boolean).length);
  const words = useMemo(() => LINE.slice(0, Math.max(1, Math.min(length, filled || 1))), [length, filled]);

  function playStream() {
    setPlaying(true);
    setTyped("");
    const pieces = LINE.slice(0, length);
    let i = 0;
    const tick = () => {
      i += 1;
      setTyped(pieces.slice(0, i).join(" "));
      if (i < pieces.length) window.setTimeout(tick, flush ? 280 : 0);
      else setPlaying(false);
    };
    if (!flush) {
      window.setTimeout(() => {
        setTyped(pieces.join(" "));
        setPlaying(false);
      }, 900);
      return;
    }
    window.setTimeout(tick, 200);
  }

  function grant(stage: StageId, amount: number, vyapti: string) {
    setNote(vyapti);
    const next = FLOW.indexOf(stage);
    const forward = next > at;
    patch({ stage, xp: save.xp + (forward ? amount : 0), reached: Math.max(save.reached, next) });
  }

  function go(index: number) {
    if (index < 0 || index > save.reached) return;
    patch({ stage: FLOW[index] });
  }

  return (
    <div className="bg mission">
      <header className="topbar">
        <div className="brand-lock">
          <strong>DevQuest</strong>
          <span className="muted">Afterfault · Mission 3.5</span>
        </div>
        <nav className="ribbon" aria-label="Stages">
          {RIBBON.map((name, index) => {
            const state = index === at ? "now" : index < save.reached ? "done" : "locked";
            return (
              <button
                key={name}
                type="button"
                className={state}
                aria-current={state === "now" ? "step" : undefined}
                disabled={state === "locked"}
                onClick={() => go(index)}
              >
                {state === "done" ? "✓" : index + 1} {name}
              </button>
            );
          })}
        </nav>
        <button className="btn ghost" onClick={() => patch({ theme: save.theme === "dark" ? "light" : "dark" })}>
          {save.theme === "dark" ? "Light" : "Dark"}
        </button>
        {onMap && <button className="btn ghost" type="button" onClick={onMap}>All topics</button>}
      </header>
      <div className="the-line" aria-label="The Line">
        {LINE.map((word, index) => (
          <span key={word} className={index < filled ? "on" : ""}>
            {word}
          </span>
        ))}
      </div>
      <div className="layout">
        <aside className="panel">
          <p className="kicker">Mission 3.5</p>
          <h1>The Unfinished Line</h1>
          <p className="who">{save.avatar ? `${save.avatar} · ops floor` : "Same path for every avatar."}</p>
          <div className="mentor">
            <div className={`orb ${save.ai ? "on" : "off"}`} aria-hidden />
            <p className="vyapti">{save.ai ? note : "Quiet isn't the same as done. Tap the next honest move."}</p>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={save.ai} onChange={(event) => patch({ ai: event.target.checked })} />
            Mentor {save.ai ? "live" : "scripted"}
          </label>
          <p className="xp-chip"><strong>{save.xp}</strong> XP</p>
        </aside>
        <main className="stage">
          {save.stage === "pick" && (
            <section>
              <h2>Who is holding the scope?</h2>
              <div className="grid">
                {AVATARS.map((avatar) => (
                  <button key={avatar.id} className="card" onClick={() => { patch({ avatar: avatar.id, stage: "open", reached: Math.max(save.reached, 0) }); setNote(`${avatar.id}. That all-green chat is your biryani.`); }}>
                    <span className="mark" aria-hidden>{avatar.id.slice(0, 1)}</span>
                    <strong>{avatar.id}</strong>
                    <span>{avatar.role}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {save.stage === "open" && (
            <section className="phone">
              <p className="rain">Friday, 9:40 PM. Rain on the hostel window.</p>
              <Bubble who="Customer" text="Where is my order?" />
              <Bubble who="Dabba Dash" text="Your order is on the|" frozen />
              <Bubble who="Ila" text="Four thousand chats tonight. All green. Lovely work, team." />
              <Bubble who={save.avatar || "Tanvi"} text="That all-green chat? That's my biryani." />
              <button className="btn" onClick={() => grant("discover", 0, "This reply stopped mid-sentence. Tap the clues.")}>Step into the ops room</button>
            </section>
          )}

          {save.stage === "discover" && (
            <section>
              <h2>The frozen sentence</h2>
              <Bubble who="Dabba Dash" text="Your order is on the|" frozen />
              <div className="grid">
                {CLUES.map((clue) => (
                  <button
                    key={clue.id}
                    className={`card ${save.clues.includes(clue.id) ? "on" : ""}`}
                    onClick={() => {
                      const clues = save.clues.includes(clue.id) ? save.clues : [...save.clues, clue.id];
                      patch({ clues });
                      setNote(`${clue.body} ${clue.line}`);
                    }}
                  >
                    <strong>{clue.title}</strong>
                    <span>{save.clues.includes(clue.id) ? clue.body : "Tap to inspect"}</span>
                  </button>
                ))}
              </div>
              {save.clues.length >= 3 && !save.asked && (
                <fieldset className="ask">
                  <legend>What's actually wrong?</legend>
                  {["The bot crashed.", "The reply stopped and nobody checked whether it finished.", "The customer's internet is slow."].map((choice) => (
                    <button key={choice} className="btn ghost" onClick={() => { patch({ asked: true, xp: save.xp + 5 }); setNote(choice.startsWith("The reply") ? "Exactly. Let's read the commentary properly." : "Close enough to feel it. The reply stopped, and the board still said all good."); }}>
                      {choice}
                    </button>
                  ))}
                </fieldset>
              )}
              {save.asked && <button className="btn" onClick={() => grant("explore", 0, "Signal's live. Bytes are dripping.")}>Open the packet scope</button>}
            </section>
          )}

          {save.stage === "explore" && (
            <Explore
              save={save}
              typed={typed}
              playing={playing}
              flush={flush}
              length={length}
              order={order}
              words={words}
              onLength={setLength}
              onFlush={setFlush}
              onPlay={playStream}
              onOrder={setOrder}
              onCheck={(index, picked) => {
                const step = STEPS[index];
                if (picked !== step.answer) {
                  setNote(step.why);
                  return;
                }
                const checks = save.checks.slice();
                checks[index] = true;
                const next = Math.min(STEPS.length, index + 1);
                patch({ checks, explore: next });
                setNote(step.why);
              }}
              onRecap1={() => {
                if (order.join(",") !== "wire,chunk,text") {
                  setNote("Order: how it travels, then one chunk, then the text inside it.");
                  return;
                }
                patch({ recap1: true });
                setNote("Three balls bowled. We know how the commentary travels.");
              }}
              onRecap2={() => {
                patch({ recap2: true, xp: save.xp + 10 });
                setNote("Six for six. The other 30% is what you do when the rain comes.");
              }}
              onAdvance={() => grant("assign", 0, "Three chats. Never all good.")}
            />
          )}

          {save.stage === "assign" && (
            <section>
              <h2>Dinner rush</h2>
              {CHATS.map((chat, index) => (
                <article key={chat.id} className="card wide">
                  <strong>{chat.who}</strong>
                  <p>Seen so far: {chat.seen}</p>
                  <p>{chat.event}</p>
                  <div className="row">
                    {chat.tiles.map((tile) => (
                      <button
                        key={tile.id}
                        className="btn ghost"
                        disabled={save.chats.includes(chat.id) || index > save.chats.length}
                        onClick={() => {
                          if (tile.id !== chat.right) {
                            setMiss(chat.miss);
                            setNote(chat.miss);
                            return;
                          }
                          setMiss("");
                          patch({ chats: [...save.chats, chat.id] });
                          setNote(`${chat.who} is honest now.`);
                        }}
                      >
                        {tile.label}
                      </button>
                    ))}
                  </div>
                  {save.chats.includes(chat.id) && <p className="good">Honest status locked.</p>}
                </article>
              ))}
              {miss && <p className="bad">{miss}</p>}
              <label>
                Temperature flag
                <input value={temp} onChange={(event) => setTemp(event.target.value)} />
              </label>
              <p className="mono">--temperature {temp} · valid only from 0.0 to 2.0 · usage logs on stderr</p>
              {save.chats.length === 3 && (
                <button
                  className="btn"
                  onClick={() => {
                    const value = Number(temp);
                    if (!Number.isFinite(value) || value < 0 || value > 2) {
                      setNote("--temperature must be between 0.0 and 2.0");
                      return;
                    }
                    grant("predict", 10, "Predict first. Then we run it.");
                  }}
                >
                  Hand the console to Ila
                </button>
              )}
            </section>
          )}

          {save.stage === "predict" && (
            <section>
              <h2>Ila's review board</h2>
              {PREDS.map((item, index) => (
                <article key={item.title} className={`card wide ${save.preds[index] !== undefined ? "on" : ""}`}>
                  <strong>P{index + 1} · {item.title}</strong>
                  <p>{item.change}</p>
                  {save.preds[index] === undefined ? (
                    <>
                      <label>
                        Confidence
                        <input type="range" min={0} max={2} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
                        <span>{["Guessing", "Think so", "Sure"][confidence]}</span>
                      </label>
                      <div className="grid">
                        {item.options.map((option, choice) => (
                          <button key={option} className="btn ghost" onClick={() => {
                            const preds = save.preds.slice();
                            preds[index] = choice;
                            patch({ preds });
                            setNote(choice === item.answer ? item.why : `${item.why} ${confidence === 2 ? "You were sure. Slow down on this one." : ""}`);
                          }}>
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>{save.preds[index] === item.answer ? "Your call matched the sim." : `The sim played a different ending. ${item.why}`}</p>
                  )}
                </article>
              ))}
              {save.preds.length === 6 && <button className="btn" onClick={() => grant("code", 15, "Enough clicking. Forge the Line Keeper.")}>Write the consumer</button>}
            </section>
          )}

          {save.stage === "code" && (
            <CodeStage
              save={save}
              tests={tests}
              onBlank={(index, value) => {
                const blanks = save.blanks.slice();
                blanks[index] = value;
                patch({ blanks });
              }}
              onRunMicro={() => {
                const ok = BLANKS.every((blank, index) => save.blanks[index] === blank.answer);
                setNote(ok ? "The line streams: Your order is on the way." : "A tile bounced. Check the slot Vyapti just named.");
                if (!ok) {
                  const missAt = BLANKS.findIndex((blank, index) => save.blanks[index] !== blank.answer);
                  setNote(missAt >= 0 ? `${BLANKS[missAt].slot} is still wrong.` : note);
                }
              }}
              onGuide={(index) => {
                const guided = save.guided.slice();
                guided[index] = true;
                patch({ guided });
                setNote(GUIDED[index].ok);
              }}
              onTests={() => {
                const forged = BLANKS.every((blank, index) => save.blanks[index] === blank.answer) && save.guided.every(Boolean);
                const rows = [
                  ["T1 complete", forged],
                  ["T2 no None", forged],
                  ["T3 quiet → partial", forged],
                  ["T4 error kept", forged],
                  ["T5 length → truncated", forged],
                  ["T7 usage line", forged],
                  ["T9 temperature 0.3", forged],
                ];
                setTests(rows.map(([name, pass]) => `${pass ? "✓" : "×"} ${name}`));
                setNote(forged ? "Line Keeper forged. Every word, and the truth about every word." : "Visible tests failed. Finish the blanks and the four guided checks.");
              }}
              onAdvance={() => grant("debug", 25, "02:10 AM. Ila's hotfix just landed.")}
            />
          )}

          {save.stage === "debug" && (
            <section>
              <h2>Ila's night-shift hotfix</h2>
              {BUGS.map((bug, index) => (
                <article key={bug.name} className="card wide">
                  <strong>{index === 4 ? "Bonus · " : ""}{bug.name}</strong>
                  <p>{bug.symptom}</p>
                  {save.bugs[index] ? <p className="good">Closed.</p> : (
                    <div className="grid">
                      <button className="btn" onClick={() => { const bugs = save.bugs.slice(); bugs[index] = true; patch({ bugs }); setBugNote(""); setNote("That test goes green."); }}>
                        {bug.fix}
                      </button>
                      {bug.wrong.map((move) => (
                        <button key={move.label} className="btn ghost" onClick={() => { setBugNote(move.line); setNote(move.line); }}>
                          {move.label}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}
              {bugNote && <p className="bad">{bugNote}</p>}
              {save.bugs.filter(Boolean).length >= 4 && (
                <button className="btn" onClick={() => grant("boss", 15, "Peak rush. Her shield is up.")}>Face the board</button>
              )}
            </section>
          )}

          {save.stage === "boss" && (
            <section>
              <h2>The All-Good Board</h2>
              <div className="meter" aria-label={`Shield ${save.shield}`}><i style={{ width: `${save.shield}%` }} /></div>
              <p className="hearts" aria-label={`${save.hearts} hearts`}>{"♥".repeat(save.hearts)}{"♡".repeat(3 - save.hearts)} <span className="mono">shield {save.shield}</span></p>
              <p>Ila: {save.phase === 0 ? "Green is a feeling." : save.phase === 1 ? "Customers don't want truth. They want a tick." : "Honest dashboards make terrible screenshots."}</p>
              {save.phase < 3 && (
                <article className="card wide">
                  <strong>Phase {save.phase + 1} · {BOSS[save.phase].name}</strong>
                  <p>{BOSS[save.phase].brief}</p>
                  <div className="grid">
                    {BOSS[save.phase].options.map((option) => (
                      <button key={option} className="btn ghost" onClick={() => {
                        if (option !== BOSS[save.phase].right) {
                          const hearts = save.hearts - 1;
                          if (hearts <= 0) {
                            patch({ hearts: 3 });
                            setNote("Recovery. Replay the rule: quiet is not done, and a stream is read once. Same phase, hearts restored. XP stays.");
                            return;
                          }
                          patch({ hearts });
                          setNote("That would ship a lie to a customer. Heart lost.");
                          return;
                        }
                        const phase = save.phase + 1;
                        const shield = phase === 1 ? 70 : phase === 2 ? 30 : 0;
                        patch({ phase, shield });
                        setNote(shield === 0 ? "Then stop screenshotting. Start shipping." : "Shield cracked.");
                      }}>
                        {option}
                      </button>
                    ))}
                  </div>
                </article>
              )}
              {save.shield === 0 && (
                <button className="btn" onClick={() => grant("win", 20, "Line restored. Every word, and the truth about every word.")}>
                  Break the shield
                </button>
              )}
            </section>
          )}

          {save.stage === "win" && (
            <section className="phone">
              <h2>Last Word</h2>
              <p>Badge earned. You don't call it done until the stream says it's done.</p>
              <p>Item: Ember Thread, a strand of Vyapti's amber core.</p>
              <p className="xp">{save.xp} XP this mission.</p>
              <Bubble who="Bot" text="Your order is on the way." />
              <Bubble who="Ila" text="I didn't break your stream this time. I just tuned it. Temperature 1.9." />
              <p>Mission 3.6 is the dials: temperature and the token cap.</p>
              <div className="row">
                {onNext && <button className="btn" type="button" onClick={onNext}>Open The Dials</button>}
                <button className="btn ghost" onClick={() => { localStorage.removeItem(SAVE); setSave(fresh()); }}>Play again</button>
              </div>
            </section>
          )}
          {at >= 0 && save.stage !== "win" && (
            <div className="stage-nav">
              <button className="btn ghost" type="button" disabled={at <= 0} onClick={() => go(at - 1)}>Back</button>
              <button className="btn" type="button" disabled={at >= save.reached} onClick={() => go(at + 1)}>
                {at < save.reached ? "Continue" : "Finish this step"}
              </button>
            </div>
          )}
        </main>
        <aside className="panel side">
          <p className="kicker">Checks</p>
          {[
            ["Clues", save.clues.length, 4],
            ["Explore", save.checks.filter(Boolean).length, 6],
            ["Chats", save.chats.length, 3],
            ["Predictions", save.preds.length, 6],
            ["Bugs", save.bugs.filter(Boolean).length, 5],
          ].map(([name, have, total]) => (
            <div className="check" key={String(name)}>
              <div className="row">
                <span>{name}</span>
                <span className="mono">{have}/{total}</span>
              </div>
              <div className="meter" aria-hidden><i style={{ width: `${(Number(have) / Number(total)) * 100}%` }} /></div>
            </div>
          ))}
          <p className="fine">The goal line fills in and never resets.</p>
        </aside>
      </div>
    </div>
  );
}

function Bubble({ who, text, frozen }: { who: string; text: string; frozen?: boolean }) {
  const shown = frozen ? text.replace("|", "") : text;
  return (
    <p className={`bubble ${frozen ? "frozen" : ""}`}>
      <span>{who}</span>
      {shown}
      {frozen && <i className="caret" aria-hidden />}
    </p>
  );
}

function Explore(props: {
  save: Progress;
  typed: string;
  playing: boolean;
  flush: boolean;
  length: number;
  order: string[];
  words: string[];
  onLength: (value: number) => void;
  onFlush: (value: boolean) => void;
  onPlay: () => void;
  onOrder: (value: string[]) => void;
  onCheck: (index: number, picked: number) => void;
  onRecap1: () => void;
  onRecap2: () => void;
  onAdvance: () => void;
}) {
  const index = props.save.checks.findIndex((ok) => !ok);
  const step = index === -1 ? null : STEPS[index];
  const needRecap1 = props.save.checks.slice(0, 3).every(Boolean) && !props.save.recap1;
  const needRecap2 = props.save.checks.every(Boolean) && props.save.recap1 && !props.save.recap2;
  return (
    <section>
      <h2>Packet scope</h2>
      <div className="scope">
        {props.words.map((word) => <span key={word}>{word}</span>)}
      </div>
      <p className="terminal" aria-live="polite">{props.flush ? props.typed || "press play" : props.playing ? "buffer held…" : props.typed || "buffer held"}</p>
      <div className="row">
        <button className="btn" onClick={props.onPlay} disabled={props.playing}>Play</button>
        <label>Length <input type="range" min={1} max={6} value={props.length} onChange={(event) => props.onLength(Number(event.target.value))} /></label>
        <label><input type="checkbox" checked={props.flush} onChange={(event) => props.onFlush(event.target.checked)} /> flush</label>
      </div>
      {needRecap1 && (
        <article className="card wide">
          <strong>Recap · drag the order</strong>
          <p>Wire, then chunk, then text.</p>
          <div className="row">
            {["wire", "chunk", "text"].map((card) => (
              <button key={card} className="btn ghost" onClick={() => props.onOrder(props.order.includes(card) ? props.order : [...props.order, card])}>{card}</button>
            ))}
          </div>
          <p>{props.order.join(" → ") || "Tap in order"}</p>
          <button className="btn" onClick={props.onRecap1}>Lock recap</button>
        </article>
      )}
      {needRecap2 && (
        <article className="card wide">
          <strong>Recap · six for six</strong>
          <p>Stream for speed. SSE to [DONE]. Text in delta.content. Flush live. One pass. finish_reason.</p>
          <button className="btn" onClick={props.onRecap2}>Mark the six</button>
        </article>
      )}
      {step && !needRecap1 && (
        <article className="card wide">
          <p className="kicker">{step.id}</p>
          <h3>{step.title}</h3>
          <p>{step.analogy}</p>
          <p>{step.watch}</p>
          <p>{step.poke}</p>
          <p><strong>{step.q}</strong></p>
          <div className="grid">
            {step.options.map((option, picked) => (
              <button key={option} className="btn ghost" onClick={() => props.onCheck(index, picked)}>{option}</button>
            ))}
          </div>
        </article>
      )}
      {props.save.recap2 && <button className="btn" onClick={props.onAdvance}>Take the dinner rush</button>}
    </section>
  );
}

function CodeStage(props: {
  save: Progress;
  tests: string[];
  onBlank: (index: number, value: string) => void;
  onRunMicro: () => void;
  onGuide: (index: number) => void;
  onTests: () => void;
  onAdvance: () => void;
}) {
  const microOk = BLANKS.every((blank, index) => props.save.blanks[index] === blank.answer);
  const guidedOk = props.save.guided.every(Boolean);
  return (
    <section>
      <h2>Forge the Line Keeper</h2>
      <div className="grid">
        {BLANKS.map((blank, index) => (
          <label key={blank.slot} className="card">
            <span>{blank.slot}</span>
            <select value={props.save.blanks[index]} onChange={(event) => props.onBlank(index, event.target.value)}>
              <option value="">Choose</option>
              {blank.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button className="btn" onClick={props.onRunMicro}>Run the blocks</button>
      {microOk && (
        <div className="grid">
          {GUIDED.map((step, index) => (
            <button key={step.step} className="card" disabled={props.save.guided[index]} onClick={() => props.onGuide(index)}>
              <strong>{step.step}</strong>
              <span>{props.save.guided[index] ? "Check passed" : step.check}</span>
            </button>
          ))}
        </div>
      )}
      {guidedOk && <button className="btn" onClick={props.onTests}>Run visible tests</button>}
      {props.tests.length > 0 && <ul>{props.tests.map((row) => <li key={row}>{row}</li>)}</ul>}
      {props.tests.some((row) => row.startsWith("✓")) && props.tests.every((row) => row.startsWith("✓")) && (
        <button className="btn" onClick={props.onAdvance}>Open Ila's diff</button>
      )}
    </section>
  );
}
