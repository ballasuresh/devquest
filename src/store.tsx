import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BUGGY_SHELF, STARTER_READ, STAGES } from "./content";

const KEY = "dq-helix-archive-v1";

export type Explore = {
  cabinet: boolean;
  item: boolean;
  gets: number;
  put: boolean;
  patch: boolean;
  stamp: boolean;
  missing: boolean;
  recall: boolean[];
};

export type Save = {
  learner: string;
  role: string;
  theme: "dark" | "light";
  review: boolean;
  xp: number;
  hearts: number;
  stage: number;
  cleared: boolean[];
  done: boolean;
  discover: Record<string, string>;
  question: string | null;
  explore: Explore;
  assign: boolean[];
  predict: boolean[];
  code: string;
  debugCode: string;
  hints: { code: number; debug: number };
  codePassed: boolean;
  debugPassed: boolean;
  contract: Record<string, string>;
  contractOk: boolean;
  masterQ: boolean[];
  design: string | null;
  tastes: Record<string, string>;
};

export function blank(): Save {
  return {
    learner: "",
    role: "Archivist",
    theme: "dark",
    review: false,
    xp: 0,
    hearts: 3,
    stage: 0,
    cleared: Array(7).fill(false),
    done: false,
    discover: {},
    question: null,
    explore: { cabinet: false, item: false, gets: 0, put: false, patch: false, stamp: false, missing: false, recall: [false, false, false] },
    assign: [false, false, false],
    predict: [false, false, false],
    code: STARTER_READ,
    debugCode: BUGGY_SHELF,
    hints: { code: 0, debug: 0 },
    codePassed: false,
    debugPassed: false,
    contract: {},
    contractOk: false,
    masterQ: [false, false, false],
    design: null,
    tastes: {},
  };
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Save;
    return { ...blank(), ...parsed, explore: { ...blank().explore, ...parsed.explore } };
  } catch {
    return blank();
  }
}

type Store = {
  save: Save;
  setSave: (patch: Partial<Save> | ((s: Save) => Save)) => void;
  miss: () => void;
  recover: boolean;
  closeRecover: () => void;
  clearStage: (index: number) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [save, setRaw] = useState<Save>(load);
  const [recover, setRecover] = useState(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(save));
    document.documentElement.dataset.theme = save.theme;
  }, [save]);

  const api = useMemo<Store>(() => {
    return {
      save,
      recover,
      closeRecover: () => setRecover(false),
      setSave: (patch) => setRaw((s) => (typeof patch === "function" ? patch(s) : { ...s, ...patch })),
      miss: () => {
        setRaw((s) => {
          if (s.hearts <= 1) {
            setRecover(true);
            return { ...s, hearts: 3 };
          }
          return { ...s, hearts: s.hearts - 1 };
        });
      },
      clearStage: (index) => {
        setRaw((s) => {
          const cleared = s.cleared.slice();
          let xp = s.xp;
          if (!cleared[index]) {
            cleared[index] = true;
            xp += STAGES[index].xp;
          }
          const done = s.done || index === 6;
          return { ...s, cleared, xp, done, stage: done ? 6 : Math.max(s.stage, Math.min(index + 1, 6)) };
        });
      },
      reset: () => {
        const theme = save.theme;
        setRaw({ ...blank(), theme });
      },
    };
  }, [save, recover]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("store");
  return ctx;
}
