import { useEffect, useState } from "react";
import { go, href, type RouteId } from "./hash";

const LINKS: { id: RouteId; label: string }[] = [
  { id: "title", label: "Home" },
  { id: "play", label: "Play" },
  { id: "academy", label: "Academy" },
  { id: "howto", label: "How to Play" },
  { id: "settings", label: "Settings" },
  { id: "scores", label: "Scores" },
];

export function NavBar({ current, backTo, backLabel }: { current: RouteId; backTo?: RouteId; backLabel?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [current]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  return (
    <header className="dq-nav">
      <a className="dq-nav-brand" href={href("title")} onClick={(e) => { e.preventDefault(); go("title"); }}>
        <strong>DevQuest</strong>
        <span>Afterfault</span>
      </a>
      {backTo && (
        <button className="dq-nav-back" type="button" onClick={() => go(backTo)}>
          ← {backLabel ?? "Back"}
        </button>
      )}
      <button
        className="dq-nav-burger"
        type="button"
        aria-expanded={open}
        aria-controls="dq-nav-links"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <nav id="dq-nav-links" className={`dq-nav-links${open ? " open" : ""}`} aria-label="Main">
        {LINKS.map((l) => (
          <a
            key={l.id}
            href={href(l.id)}
            aria-current={current === l.id ? "page" : undefined}
            className={current === l.id ? "on" : undefined}
            onClick={(e) => { e.preventDefault(); go(l.id); }}
          >
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
