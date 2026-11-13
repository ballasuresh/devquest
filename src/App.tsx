import { useState } from "react";
import { Dials } from "./dials";
import { Unfinished } from "./unfinished";

type Topic = "home" | "line" | "dials";

export function App() {
  const [topic, setTopic] = useState<Topic>("home");
  if (topic === "line") return <Unfinished onMap={() => setTopic("home")} onNext={() => setTopic("dials")} />;
  if (topic === "dials") return <Dials onMap={() => setTopic("home")} />;
  return (
    <div className="bg mission">
      <header className="topbar">
        <div className="brand-lock">
          <strong>DevQuest</strong>
          <span className="muted">Afterfault · The Retry Storm</span>
        </div>
      </header>
      <main className="layout">
        <section className="stage">
          <p className="kicker">Pick a topic</p>
          <h2>Two missions</h2>
          <div className="grid">
            <button className="card" type="button" onClick={() => setTopic("line")}>
              <span className="mark">3.5</span>
              <strong>The Unfinished Line</strong>
              <span>A support reply freezes. Read the stream and say whether it finished.</span>
            </button>
            <button className="card" type="button" onClick={() => setTopic("dials")}>
              <span className="mark">3.6</span>
              <strong>The Dials</strong>
              <span>Replies finish, but some turn into poetry and some stop at twelve words.</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
