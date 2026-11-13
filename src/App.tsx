import { useCallback, useState } from "react";
import { Arena } from "./action/Arena";
import { Dials } from "./dials";
import { Unfinished } from "./unfinished";
import { WorldHub, type HubMission } from "./ui/WorldHub";
import type { Difficulty } from "./game/types";

type View = "arena" | "hub" | HubMission;

export function App() {
  const [view, setView] = useState<View>("arena");
  const [difficulty, setDifficulty] = useState<Difficulty>("guided");
  const toAcademy = useCallback(() => setView("hub"), []);

  if (view === "arena") return <Arena onAcademy={toAcademy} />;
  if (view === "line") {
    return (
      <Unfinished
        difficulty={difficulty}
        onMap={() => setView("hub")}
        onNext={() => setView("dials")}
      />
    );
  }
  if (view === "dials") {
    return <Dials difficulty={difficulty} onMap={() => setView("hub")} />;
  }
  return (
    <div className="academy-wrap">
      <button className="btn academy-back" type="button" onClick={() => setView("arena")}>
        Back to the fight
      </button>
      <WorldHub
        onEnter={(id, mode) => {
          setDifficulty(mode);
          setView(id);
        }}
      />
    </div>
  );
}
