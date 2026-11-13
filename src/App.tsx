import { useState } from "react";
import { Dials } from "./dials";
import { Unfinished } from "./unfinished";
import { WorldHub, type HubMission } from "./ui/WorldHub";
import type { Difficulty } from "./game/types";

export function App() {
  const [view, setView] = useState<HubMission | "hub">("hub");
  const [difficulty, setDifficulty] = useState<Difficulty>("guided");

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
    <WorldHub
      onEnter={(id, mode) => {
        setDifficulty(mode);
        setView(id);
      }}
    />
  );
}
