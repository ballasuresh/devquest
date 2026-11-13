import { useEffect, type ReactNode } from "react";
import { go, type RouteId } from "./hash";
import { NavBar } from "./NavBar";

const PARENT: Partial<Record<RouteId, RouteId>> = {
  line: "academy",
  dials: "academy",
  academy: "title",
  howto: "title",
  settings: "title",
  scores: "title",
};

export function Shell({
  route,
  children,
  backTo,
  backLabel,
  onEscape,
}: {
  route: RouteId;
  children: ReactNode;
  backTo?: RouteId;
  backLabel?: string;
  onEscape?: () => boolean | void;
}) {
  const back = backTo ?? PARENT[route];

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (onEscape && onEscape() === true) {
        e.preventDefault();
        return;
      }
      if (route === "title") return;
      if (back) {
        e.preventDefault();
        go(back);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [route, back, onEscape]);

  return (
    <div className="dq-shell">
      <NavBar current={route} backTo={back} backLabel={backLabel} />
      <div className="dq-shell-body">{children}</div>
    </div>
  );
}
