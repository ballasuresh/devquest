import { useCallback, useEffect, useState } from "react";
import { Arena } from "./action/Arena";
import { Dials } from "./dials";
import { Unfinished } from "./unfinished";
import { WorldHub } from "./ui/WorldHub";
import type { Difficulty } from "./game/types";
import { go } from "./nav/hash";
import { useRoute } from "./nav/useRoute";
import { Shell } from "./nav/Shell";
import { Title } from "./nav/Title";
import { HowToPlay } from "./nav/HowToPlay";
import { Settings } from "./nav/Settings";
import { Scores } from "./nav/Scores";
import { loadPrefs, onPrefs } from "./nav/prefs";

export function App() {
  const route = useRoute();
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    try {
      const raw = localStorage.getItem("dq-battle-pref");
      if (raw) {
        const d = (JSON.parse(raw) as { difficulty?: Difficulty }).difficulty;
        if (d === "micro" || d === "guided" || d === "ranked") return d;
      }
    } catch { /* ignore */ }
    return "guided";
  });

  const toTitle = useCallback(() => go("title"), []);
  const toAcademy = useCallback(() => go("academy"), []);

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.motion = loadPrefs().reducedMotion ? "reduce" : "full";
    };
    apply();
    return onPrefs(apply);
  }, []);

  if (route === "play") {
    return <Arena onAcademy={toAcademy} onTitle={toTitle} />;
  }

  if (route === "line") {
    return (
      <Shell route="line" backTo="academy" backLabel="Academy">
        <Unfinished
          difficulty={difficulty}
          onMap={() => go("academy")}
          onNext={() => go("dials")}
        />
      </Shell>
    );
  }

  if (route === "dials") {
    return (
      <Shell route="dials" backTo="academy" backLabel="Academy">
        <Dials difficulty={difficulty} onMap={() => go("academy")} />
      </Shell>
    );
  }

  if (route === "academy") {
    return (
      <Shell route="academy" backTo="title" backLabel="Home">
        <WorldHub
          onEnter={(id, mode) => {
            setDifficulty(mode);
            go(id);
          }}
        />
      </Shell>
    );
  }

  if (route === "howto") {
    return (
      <Shell route="howto">
        <HowToPlay />
      </Shell>
    );
  }

  if (route === "settings") {
    return (
      <Shell route="settings">
        <Settings />
      </Shell>
    );
  }

  if (route === "scores") {
    return (
      <Shell route="scores">
        <Scores />
      </Shell>
    );
  }

  return (
    <Shell route="title">
      <Title />
    </Shell>
  );
}
