import { useEffect, useState } from "react";
import { ensureHash, parseHash, type RouteId } from "./hash";

export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => {
    ensureHash();
    return parseHash();
  });
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
