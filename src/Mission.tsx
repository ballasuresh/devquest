import { useEffect, useState } from "react";
import {
  ASSIGN,
  CODE_HINTS,
  CONTRACT,
  DEBUG_HINTS,
  DISCOVER_SCENES,
  MASTER_Q,
  PREDICT,
  QUESTIONS,
  RECALL,
  REVIEW,
  STAGES,
} from "./content";
import { gradeFetchShelf, gradeReadBeacon, passed, simulateRead, simulateShelf } from "./grade";
import { useStore } from "./store";

const OPENERS = [
  "Three counters are still arguing. Don't collect vocabulary. Collect the itch.",
  "The counters are shut. The bench uses beacons, not the market. Watch what each stamp does.",
  "New district. Shelves, not beacons. Same discipline, different nouns.",
  "Commit the printout before I run it. A hunch you can edit after the result is not a hunch.",
  "The path is already joined. Make the failure loud, and hand back a ledger, not a string.",
  "This is a different function. The night shift bent the path, the status, and the body.",
  "Design a contract this spire has never hung on the wall. Departures. Then decide who filters.",
];

export function Mission({ onExit, onVictory }: { onExit: () => void; onVictory: () => void }) {
  const { save, recover, closeRecover, clearStage } = useStore();
  const [view, setView] = useState(save.stage);
  const [nova, setNova] = useState(OPENERS[save.stage] ?? OPENERS[0]);
  const [toast, setToast] = useState("");
  const [scene, setScene] = useState(DISCOVER_SCENES[0].id);
  const [lab, setLab] = useState(0);
  const [assignPick, setAssignPick] = useState<string | null>(null);
  const [assignWhy, setAssignWhy] = useState("");
  const [predPick, setPredPick] = useState<number | null>(null);
  const [predWhy, setPredWhy] = useState("");
  const [output, setOutput] = useState("Simulated relay · no live network");
  const [debugOut, setDebugOut] = useState("Simulated relay · night-shift drop · not run yet");
  const [contractNote, setContractNote] = useState("");
  const [qWhy, setQWhy] = useState("");
  const [designWhy, setDesignWhy] = useState("");

  useEffect(() => {
    setView(save.stage);
    setNova(OPENERS[save.stage] ?? OPENERS[0]);
  }, [save.stage]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stage = STAGES[view];
  const unlocked = (index: number) => index <= save.stage || save.cleared[index];

  function advance(index: number) {
    const first = !save.cleared[index];
    clearStage(index);
    if (first) setToast(`+${STAGES[index].xp}* mission XP`);
    if (index === 6) onVictory();
  }

  return (
    <>
      <div className="workspace">
        <aside className="rail" aria-label="Mission stages">
          {STAGES.map((item, index) => {
            const state = save.cleared[index] ? "done" : view === index ? "on" : "";
            return (
              <button
                key={item.key}
                className={`stage ${state}`}
                disabled={!unlocked(index)}
                aria-current={view === index ? "step" : undefined}
                onClick={() => setView(index)}
              >
                <span className="dot">{save.cleared[index] ? "✓" : index + 1}</span>
                <span>
                  {item.label}
                  <em>{unlocked(index) ? item.job : "Locked"}</em>
                </span>
              </button>
            );
          })}
          <button className="btn ghost small" style={{ width: "100%", marginTop: 8 }} onClick={onExit}>
            Back to the spire
          </button>
        </aside>
        <section className="panel">
          <p className="kicker">Mission 3.1 · The Endpoint Archive · {stage.job}</p>
          <h2>{stage.label}</h2>
          {save.review && <p className="review">{REVIEW[stage.key]}</p>}
          {view === 0 && (
            <Discover
              scene={scene}
              setScene={setScene}
              say={setNova}
              onDone={() => advance(0)}
            />
          )}
          {view === 1 && <Explore lab={lab} setLab={setLab} say={setNova} onDone={() => advance(1)} />}
          {view === 2 && (
            <Assign
              pick={assignPick}
              setPick={setAssignPick}
              why={assignWhy}
              setWhy={setAssignWhy}
              say={setNova}
              onDone={() => advance(2)}
            />
          )}
          {view === 3 && (
            <Predict
              pick={predPick}
              setPick={setPredPick}
              why={predWhy}
              setWhy={setPredWhy}
              say={setNova}
              onDone={() => advance(3)}
            />
          )}
          {view === 4 && (
            <CodeStage output={output} setOutput={setOutput} say={setNova} onDone={() => advance(4)} />
          )}
          {view === 5 && (
            <DebugStage output={debugOut} setOutput={setDebugOut} say={setNova} onDone={() => advance(5)} />
          )}
          {view === 6 && (
            <Master
              note={contractNote}
              setNote={setContractNote}
              qWhy={qWhy}
              setQWhy={setQWhy}
              designWhy={designWhy}
              setDesignWhy={setDesignWhy}
              say={setNova}
              onDone={() => advance(6)}
            />
          )}
        </section>
        <aside className="nova">
          <div className="who">
            <span className="mark">N</span>
            <div>
              <strong>Nova</strong>
              <div className="muted">Relay mentor · scripted</div>
            </div>
          </div>
          <div className={`wave ${nova ? "go" : ""}`} aria-hidden="true">
            <b /><b /><b /><b />
          </div>
          <p>{nova}</p>
          <p className="muted">Hints point. They do not paste a finished solution. No live model is called.</p>
        </aside>
      </div>
      {toast && <div className="toast">{toast}</div>}
      {recover && (
        <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="recover-title">
          <div className="card">
            <p className="kicker">Recovery</p>
            <h3 id="recover-title">The filament flickers.</h3>
            <p>Your work stays. Three hearts return. Mission XP already earned is not removed.</p>
            <button className="btn primary" onClick={closeRecover}>Stand back up</button>
          </div>
        </div>
      )}
    </>
  );
}

function Discover({
  scene,
  setScene,
  say,
  onDone,
}: {
  scene: string;
  setScene: (id: string) => void;
  say: (s: string) => void;
  onDone: () => void;
}) {
  const { save, setSave } = useStore();
  const current = DISCOVER_SCENES.find((s) => s.id === scene) ?? DISCOVER_SCENES[0];
  const seen = Object.keys(save.discover).length;
  return (
    <div className="stack">
      <p>Night market, under the spire. Three counters are failing in different ways. Nothing here is named REST.</p>
      <div className="doors">
        {DISCOVER_SCENES.map((item) => (
          <button key={item.id} className={`door ${scene === item.id ? "on" : ""} ${save.discover[item.id] ? "seen" : ""}`} onClick={() => setScene(item.id)}>
            <strong>{item.place}</strong>
            <small>{save.discover[item.id] ? "Noticed" : "Unopened"}</small>
          </button>
        ))}
      </div>
      <article className="card">
        <h3>{current.place}</h3>
        <p>{current.line}</p>
        <p><strong>{current.prompt}</strong></p>
        <div className="stack">
          {current.options.map((opt) => (
            <button
              key={opt.id}
              className={`choice ${save.discover[current.id] === opt.id ? "good" : ""}`}
              onClick={() => {
                setSave((s) => ({ ...s, discover: { ...s.discover, [current.id]: opt.id } }));
                say(opt.nova);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </article>
      {seen === 3 && (
        <article className="card">
          <h3>If you could shout one question at the city, which would it be?</h3>
          <p className="muted">This is not scored. I will bring your question back when the seal is yours.</p>
          <div className="stack">
            {QUESTIONS.map((q) => (
              <button
                key={q.id}
                className={`choice ${save.question === q.id ? "good" : ""}`}
                onClick={() => {
                  setSave((s) => ({ ...s, question: q.id }));
                  say(
                    q.id === "precise"
                      ? "That question has a shape. Hold it. The archive will test the shape, not the stall."
                      : "A vague shout is how the book got dumped. You can still go up. Watch what a precise ask looks like.",
                  );
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </article>
      )}
      <div className="row">
        <button className="btn primary" disabled={seen < 3 || !save.question} onClick={onDone}>
          Advance to Explore
        </button>
        <span className="muted">{seen}/3 counters · {save.question ? "question kept" : "question open"}</span>
      </div>
    </div>
  );
}

function Explore({
  lab,
  setLab,
  say,
  onDone,
}: {
  lab: number;
  setLab: (n: number) => void;
  say: (s: string) => void;
  onDone: () => void;
}) {
  const { save, setSave, miss } = useStore();
  const ex = save.explore;
  const labs = ["Cabinet", "GET", "Stamps", "Missing", "Recall"];
  const open = [
    true,
    ex.cabinet && ex.item,
    ex.gets >= 2,
    ex.stamp,
    ex.missing,
  ];
  const [putLedger, setPutLedger] = useState(false);
  const [why, setWhy] = useState("");

  function patch(partial: Partial<typeof ex>) {
    setSave((s) => ({ ...s, explore: { ...s.explore, ...partial } }));
  }

  return (
    <div className="stack">
      <p>Archive bench. The object is a beacon, not a market stall. Send the call and watch the ledger. The night dialogue stays downstairs.</p>
      <div className="steps">
        {labs.map((name, i) => (
          <button key={name} className={`btn small ${lab === i ? "amber" : "ghost"}`} disabled={!open[i]} onClick={() => setLab(i)}>
            {name}
          </button>
        ))}
      </div>
      {lab === 0 && (
        <div className="split">
          <div className="stack">
            <button className="btn" onClick={() => { patch({ cabinet: true }); say("That is the cabinet. Three beacons travelled to you because you did not name one."); }}>
              Ask for the cabinet · GET /beacons
            </button>
            <button className="btn" onClick={() => { patch({ item: true }); say("One card. The path /beacons/17 is the whole difference."); }}>
              Ask for beacon 17 · GET /beacons/17
            </button>
          </div>
          <div className="stack">
            {ex.cabinet && <pre className="ledger">{`200\nbeacons: 3\n17 North · lit\n18 East · dark\n19 West · lit`}</pre>}
            {ex.item && <pre className="ledger">{`200\n{\n  "id": "17",\n  "name": "North",\n  "lit": true,\n  "keeper": "Isha"\n}`}</pre>}
            {!ex.cabinet && !ex.item && <p className="muted">Send both asks. The contrast is the lesson.</p>}
          </div>
        </div>
      )}
      {lab === 1 && (
        <div className="stack">
          <pre className="ledger">{`GET /beacons/17\n{\n  "id": "17",\n  "lit": ${ex.gets ? "true" : "true"},\n  "keeper": "Isha"\n}\nSends recorded: ${ex.gets}`}</pre>
          <p>JSON is the agreed shape: keys and values the next desk can trust. GET reads. It must not change the beacon.</p>
          <button
            className="btn primary"
            onClick={() => {
              const gets = Math.min(2, ex.gets + 1);
              patch({ gets });
              say(gets === 1 ? "First reply is in. Send it again. Watch the keeper." : "Second GET. Same ledger. The lamp did not flip. That is what safe means.");
            }}
          >
            Send GET
          </button>
        </div>
      )}
      {lab === 2 && (
        <StampLab
          sawPut={putLedger}
          onPut={() => {
            setPutLedger(true);
            patch({ put: true });
            say("The body only said lit. PUT replaced the whole record. The keeper was not in the body, so the keeper is gone.");
          }}
          onPatch={() => {
            patch({ patch: true });
            say("PATCH changed lit and left the keeper. A one-field change needs the stamp that means one field.");
          }}
          onChoose={(id) => {
            if (id === "patch") {
              patch({ stamp: true });
              setWhy("PATCH. The keeper survives because you did not send a replacement of the whole record.");
              say("Keep that stamp for a one-field change. Recall will not ask it again.");
            } else {
              miss();
              setWhy("PUT is the stamp you just watched erase the keeper. GET does not write.");
              say("Look at the ledger again. Which send removed Isha?");
            }
          }}
          why={why}
          put={ex.put}
          patched={ex.patch}
          chosen={ex.stamp}
        />
      )}
      {lab === 3 && (
        <div className="stack">
          <button className="btn" onClick={() => say("The path is well formed. Beacon 99 is not in the archive.")}>Send GET /beacons/99</button>
          <pre className="ledger">{`GET /beacons/99\n404\n{}`}</pre>
          <p>What does 404 say?</p>
          {[
            ["missing", "The caller asked for something the archive does not have"],
            ["down", "The archive crashed"],
            ["ugly", "The JSON was ugly"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`choice ${ex.missing && id === "missing" ? "good" : ""}`}
              onClick={() => {
                if (id === "missing") {
                  patch({ missing: true });
                  say("404 is a missing thing. A crash would be 500, and that would be the archive's fault. Remember the split. Recall will ask a different question.");
                } else {
                  miss();
                  say(id === "down" ? "A crash is 500. 404 means the name was clear and the thing was absent." : "The body can be empty. The status is the sentence.");
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {lab === 4 && <Recall say={say} />}
      <div className="row">
        {lab < 4 && (
          <button className="btn" disabled={!open[lab + 1]} onClick={() => setLab(lab + 1)}>
            Next bench
          </button>
        )}
        <button className="btn primary" disabled={!ex.recall.every(Boolean)} onClick={onDone}>
          Advance to Assign
        </button>
        <span className="muted">Recall {ex.recall.filter(Boolean).length}/3</span>
      </div>
    </div>
  );
}

function StampLab({
  sawPut,
  put,
  patched,
  chosen,
  onPut,
  onPatch,
  onChoose,
  why,
}: {
  sawPut: boolean;
  put: boolean;
  patched: boolean;
  chosen: boolean;
  onPut: () => void;
  onPatch: () => void;
  onChoose: (id: string) => void;
  why: string;
}) {
  const keeperGone = sawPut && !patched;
  return (
    <div className="split">
      <div className="stack">
        <button className="btn" onClick={onPut}>Send PUT /beacons/17 {"{ lit: true }"}</button>
        <button className="btn" disabled={!put} onClick={onPatch}>Send PATCH /beacons/17 {"{ lit: true }"}</button>
        <p>Which stamp changes one field without deleting the rest?</p>
        {[
          ["patch", "PATCH"],
          ["put", "PUT"],
          ["get", "GET"],
        ].map(([id, label]) => (
          <button key={id} className={`choice ${chosen && id === "patch" ? "good" : ""}`} disabled={!put || !patched} onClick={() => onChoose(id)}>
            {label}
          </button>
        ))}
        {why && <div className={`feedback ${chosen ? "good" : "bad"}`}>{why}</div>}
      </div>
      <pre className="ledger">{`{\n  "id": "17",\n  "lit": ${put || patched ? "true" : "false"},\n  "keeper": "${keeperGone ? "" : "Isha"}"\n}${keeperGone ? "\nkeeper was erased" : ""}`}</pre>
    </div>
  );
}

function Recall({ say }: { say: (s: string) => void }) {
  const { save, setSave, miss } = useStore();
  const next = save.explore.recall.findIndex((ok) => !ok);
  if (next === -1) return <p className="feedback good">Recall holds. The counters were not replayed.</p>;
  const item = RECALL[next];
  return (
    <div className="stack">
      <p className="kicker">Recall {next + 1} of 3 · the counters stay shut</p>
      <h3>{item.prompt}</h3>
      {item.options.map((opt) => (
        <button
          key={opt.id}
          className="choice"
          onClick={() => {
            if (opt.id === item.correct) {
              const recall = save.explore.recall.slice();
              recall[next] = true;
              setSave((s) => ({ ...s, explore: { ...s.explore, recall } }));
              say(next === 2 ? "That's the bench, remembered. Isha is waiting in another district." : item.why);
            } else {
              miss();
              say(item.why);
            }
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Assign({
  pick,
  setPick,
  why,
  setWhy,
  say,
  onDone,
}: {
  pick: string | null;
  setPick: (id: string | null) => void;
  why: string;
  setWhy: (s: string) => void;
  say: (s: string) => void;
  onDone: () => void;
}) {
  const { save, setSave, miss } = useStore();
  const index = save.assign.findIndex((ok) => !ok);
  if (index === -1) {
    return (
      <div className="stack">
        <p className="feedback good">Isha accepts the clinic contract. Beacons were not part of this quest.</p>
        <button className="btn primary" onClick={onDone}>Advance to Predict</button>
      </div>
    );
  }
  const task = ASSIGN[index];
  return (
    <div className="stack">
      <p className="kicker">Clinic quest {index + 1} of 3 · transfer</p>
      <h3>{task.prompt}</h3>
      {task.options.map((opt) => (
        <button key={opt.id} className={`choice ${pick === opt.id ? "on" : ""}`} onClick={() => setPick(opt.id)}>
          <strong>{opt.label}</strong>
          <div className="muted">{opt.note}</div>
        </button>
      ))}
      {why && <div className={`feedback ${why.startsWith("Accepted") ? "good" : "bad"}`}>{why}</div>}
      <button
        className="btn primary"
        disabled={!pick}
        onClick={() => {
          if (!pick) return;
          if (pick === task.correct) {
            const assign = save.assign.slice();
            assign[index] = true;
            setSave((s) => ({ ...s, assign }));
            setWhy("Accepted. The noun changed. The discipline did not.");
            setPick(null);
            say(index === 2 ? "The clinic can read, create, and change a part. Next you commit a result before you see it." : "Accepted. Next slip.");
          } else {
            miss();
            const bag = task.wrong as unknown as Record<string, string>;
            setWhy(bag[pick] ?? "That call does a different job.");
            say("Read the feedback. The shelf is still waiting.");
          }
        }}
      >
        Accept this slip
      </button>
    </div>
  );
}

function Predict({
  pick,
  setPick,
  why,
  setWhy,
  say,
  onDone,
}: {
  pick: number | null;
  setPick: (n: number | null) => void;
  why: string;
  setWhy: (s: string) => void;
  say: (s: string) => void;
  onDone: () => void;
}) {
  const { save, setSave, miss } = useStore();
  const index = save.predict.findIndex((ok) => !ok);
  if (index === -1) {
    return (
      <div className="stack">
        <p className="feedback good">Three hunches committed before the run. The relay agreed.</p>
        <button className="btn primary" onClick={onDone}>Advance to Code</button>
      </div>
    );
  }
  const item = PREDICT[index];
  return (
    <div className="stack">
      <p className="kicker">Hunch {index + 1} of 3 · commit before the result</p>
      <p>{item.note}</p>
      <pre className="ledger">{item.code}</pre>
      {item.options.map((label, i) => (
        <button key={label} className={`choice ${pick === i ? "on" : ""}`} onClick={() => setPick(i)}>
          {label}
        </button>
      ))}
      {why && <div className={`feedback ${why.startsWith("Committed") ? "good" : "bad"}`}>{why}</div>}
      <button
        className="btn amber"
        disabled={pick === null}
        onClick={() => {
          if (pick === null) return;
          if (pick === item.correct) {
            const predict = save.predict.slice();
            predict[index] = true;
            setSave((s) => ({ ...s, predict }));
            setWhy(`Committed. ${item.why}`);
            setPick(null);
            say("Locked. You don't get to edit the hunch after the lamp turns on.");
          } else {
            miss();
            setWhy(item.why);
            say("The run disagrees. The hunch stays wrong until you commit a better one. Same item.");
          }
        }}
      >
        Commit hunch
      </button>
    </div>
  );
}

function CodeStage({
  output,
  setOutput,
  say,
  onDone,
}: {
  output: string;
  setOutput: (s: string) => void;
  say: (s: string) => void;
  onDone: () => void;
}) {
  const { save, setSave, miss } = useStore();
  const checks = gradeReadBeacon(save.code);
  const ok = passed(checks);
  return (
    <div className="stack">
      <p>Forge <code>read_beacon</code>. The simulated relay never leaves this browser. Check is what clears the stage.</p>
      <textarea
        className="code"
        spellCheck={false}
        aria-label="Python editor for read_beacon"
        value={save.code}
        onChange={(e) => setSave((s) => ({ ...s, code: e.target.value, codePassed: false }))}
      />
      <div className="row">
        <button className="btn" onClick={() => setOutput(simulateRead(save.code))}>Run</button>
        <button
          className="btn primary"
          onClick={() => {
            setOutput(simulateRead(save.code));
            if (ok) {
              setSave((s) => ({ ...s, codePassed: true }));
              say("One path, a number for the status, a parsed ledger back.");
            } else {
              setSave((s) => ({ ...s, codePassed: false }));
              miss();
              say("The check failed. Your code stays. Ask for a hint if you want a pointer, not a solution.");
            }
          }}
        >
          Check
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            if (save.hints.code >= 3) return;
            setSave((s) => ({ ...s, hints: { ...s.hints, code: s.hints.code + 1 } }));
            say(CODE_HINTS[save.hints.code] ?? CODE_HINTS[2]);
          }}
        >
          Hint {Math.min(save.hints.code + 1, 3)} / 3
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            if (confirm("Reset this editor to the starter?")) {
              setSave((s) => ({ ...s, code: STARTER() }));
            }
          }}
        >
          Reset starter
        </button>
      </div>
      {save.hints.code > 0 && (
        <div className="feedback">
          {CODE_HINTS.slice(0, save.hints.code).map((h) => <p key={h}>{h}</p>)}
        </div>
      )}
      <pre className="ledger">{output}</pre>
      <div className="tests">
        {checks.map((c) => (
          <div key={c.id} className="test">
            <span><b className={c.pass ? "pass" : "fail"}>{c.pass ? "Pass" : "Fail"}</b> · {c.name}</span>
            <span className="muted">{c.detail}</span>
          </div>
        ))}
      </div>
      <button className="btn primary" disabled={!save.codePassed} onClick={onDone}>Advance to Debug</button>
    </div>
  );
}

function STARTER() {
  return `def read_beacon(base, beacon_id):\n    url = base + "/beacons/" + beacon_id\n    response = relay.get(url)\n    # Return the parsed ledger when status_code is 200.\n    # Otherwise raise RelayError("missing").\n    return None\n`;
}

function DebugStage({
  output,
  setOutput,
  say,
  onDone,
}: {
  output: string;
  setOutput: (s: string) => void;
  say: (s: string) => void;
  onDone: () => void;
}) {
  const { save, setSave, miss } = useStore();
  const checks = gradeFetchShelf(save.debugCode);
  const ok = passed(checks);
  return (
    <div className="stack">
      <p>Night-shift drop. <code>fetch_shelf</code> should return the serum ledger for med-9 and raise <code>RelayError</code> otherwise. Expected and actual stay on screen.</p>
      <pre className="ledger">{`Expected\nGET /shelves/med-9 → 200 → {"id":"med-9","name":"serum","qty":4}\nGET /shelves/nope → RelayError`}</pre>
      <textarea
        className="code"
        spellCheck={false}
        aria-label="Python editor for fetch_shelf"
        value={save.debugCode}
        onChange={(e) => setSave((s) => ({ ...s, debugCode: e.target.value, debugPassed: false }))}
      />
      <div className="row">
        <button className="btn" onClick={() => setOutput(simulateShelf(save.debugCode))}>Run</button>
        <button
          className="btn primary"
          onClick={() => {
            setOutput(simulateShelf(save.debugCode));
            if (ok) {
              setSave((s) => ({ ...s, debugPassed: true }));
              say("Three bends, three repairs. The shelf name survived.");
            } else {
              setSave((s) => ({ ...s, debugPassed: false }));
              miss();
              say("Still bent. The code stays in the editor.");
            }
          }}
        >
          Check repair
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            if (save.hints.debug >= 3) return;
            const n = save.hints.debug;
            setSave((s) => ({ ...s, hints: { ...s.hints, debug: n + 1 } }));
            say(DEBUG_HINTS[n]);
          }}
        >
          Hint {Math.min(save.hints.debug + 1, 3)} / 3
        </button>
      </div>
      {save.hints.debug > 0 && (
        <div className="feedback">
          {DEBUG_HINTS.slice(0, save.hints.debug).map((h) => <p key={h}>{h}</p>)}
        </div>
      )}
      <pre className="ledger">{output}</pre>
      <div className="tests">
        {checks.map((c) => (
          <div key={c.id} className="test">
            <span><b className={c.pass ? "pass" : "fail"}>{c.pass ? "Pass" : "Fail"}</b> · {c.name}</span>
            <span className="muted">{c.detail}</span>
          </div>
        ))}
      </div>
      <button className="btn primary" disabled={!save.debugPassed} onClick={onDone}>Advance to Master</button>
    </div>
  );
}

const CONTRACT_WHY: Record<string, string> = {
  "/departure": "The list is a plural noun. One departure is the item.",
  "/getDepartures": "Get is a verb. A path names a thing.",
  "/departures": "The collection is right, but this row asked for one departure.",
  "/departure?id=": "The id is part of the thing's name, not a filter bolted on.",
  "POST → 200": "POST creates. 200 does not say a new thing exists.",
  "GET → 201": "A read does not create, so it should not answer 201.",
  "PUT → 200": "PUT replaces a record you already named. A new departure is a create.",
  PUT: "PUT replaces the whole departure. The platform number was the only change.",
  POST: "POST would try to create another departure.",
  "200": "200 would claim the missing departure is fine.",
  "500": "500 would blame the archive. The id was simply not there.",
};

function Master({
  note,
  setNote,
  qWhy,
  setQWhy,
  designWhy,
  setDesignWhy,
  say,
  onDone,
}: {
  note: string;
  setNote: (s: string) => void;
  qWhy: string;
  setQWhy: (s: string) => void;
  designWhy: string;
  setDesignWhy: (s: string) => void;
  say: (s: string) => void;
  onDone: () => void;
}) {
  const { save, setSave, miss } = useStore();
  const qIndex = save.masterQ.findIndex((ok) => !ok);
  return (
    <div className="stack">
      <p>The Warden wants a contract for departures. You have not been shown this resource. Build it.</p>
      <div className="stack">
        {CONTRACT.map((row) => (
          <div key={row.id} className="card" style={{ boxShadow: "none" }}>
            <strong>{row.label}</strong>
            <div className="row" style={{ marginTop: 8 }}>
              {row.options.map((opt) => (
                <button
                  key={opt}
                  className={`btn small ${save.contract[row.id] === opt ? "amber" : "ghost"}`}
                  onClick={() => setSave((s) => ({ ...s, contract: { ...s.contract, [row.id]: opt }, contractOk: false }))}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          className="btn primary"
          onClick={() => {
            const missing = CONTRACT.some((row) => !save.contract[row.id]);
            if (missing) {
              setNote("Every row needs a stamp before the wall will take it.");
              say("Blank stamps are not a contract.");
              return;
            }
            const bad = CONTRACT.filter((row) => save.contract[row.id] !== row.correct);
            if (bad.length) {
              miss();
              const first = bad[0];
              const chosen = save.contract[first.id];
              setNote(`${first.label}: ${CONTRACT_WHY[chosen] ?? "That stamp does a different job."}`);
              say("The wall stays bare until every stamp is honest.");
            } else {
              setSave((s) => ({ ...s, contractOk: true }));
              setNote("The Warden hangs the contract. Now answer without your notes from the clinic.");
              say("Contract accepted. The next three are judgements, not a repeat of PATCH.");
            }
          }}
        >
          Hang the contract
        </button>
        {note && <div className={`feedback ${save.contractOk ? "good" : "bad"}`}>{note}</div>}
      </div>
      {save.contractOk && qIndex >= 0 && (
        <article className="card">
          <p className="kicker">Judgement {qIndex + 1} of 3</p>
          <h3>{MASTER_Q[qIndex].prompt}</h3>
          {MASTER_Q[qIndex].options.map((opt) => (
            <button
              key={opt.id}
              className="choice"
              onClick={() => {
                if (opt.id === MASTER_Q[qIndex].correct) {
                  const masterQ = save.masterQ.slice();
                  masterQ[qIndex] = true;
                  setSave((s) => ({ ...s, masterQ }));
                  setQWhy(MASTER_Q[qIndex].why);
                  say("Strike. The ward gives.");
                } else {
                  miss();
                  setQWhy(MASTER_Q[qIndex].why);
                  say("Not that. Same question.");
                }
              }}
            >
              {opt.label}
            </button>
          ))}
          {qWhy && <div className="feedback">{qWhy}</div>}
        </article>
      )}
      {save.contractOk && qIndex === -1 && (
        <article className="card">
          <h3>Ten thousand departures. The board needs the red line only.</h3>
          {[
            ["wire", "GET /departures?line=red — the archive filters before the payload crosses the city."],
            ["client", "GET /departures, then filter in Python — keep the archive simple."],
            ["newer", "Use a query string because query strings are the newer feature."],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`choice ${save.design === id ? "good" : ""}`}
              onClick={() => {
                if (id === "wire") {
                  setSave((s) => ({ ...s, design: id }));
                  setDesignWhy("The board asked for one line. Moving every departure to the board is a different, heavier request.");
                  say("That is the creative cut. A precise ask, the same itch you brought from the market, now at city scale.");
                } else {
                  miss();
                  setDesignWhy(
                    id === "client"
                      ? "Honest for ten rows. Dishonest for ten thousand. Simpler for the archive, costly on the wire."
                      : "Nothing about the contract got newer. The reason is who does the work.",
                  );
                  say("Give the reason that survives a bigger city.");
                }
              }}
            >
              {label}
            </button>
          ))}
          {designWhy && <div className={`feedback ${save.design ? "good" : "bad"}`}>{designWhy}</div>}
          <button className="btn amber" disabled={!save.design} onClick={onDone} style={{ marginTop: 12 }}>
            Seal the archive
          </button>
        </article>
      )}
    </div>
  );
}
