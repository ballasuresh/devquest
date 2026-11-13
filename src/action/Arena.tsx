import { useEffect, useRef } from "react";
import { createGame } from "./game";

export function Arena({ onAcademy }: { onAcademy: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const game = createGame(canvas, { onAcademy });
    return () => game.destroy();
  }, [onAcademy]);

  return (
    <div className="arena-wrap" ref={wrap}>
      <canvas ref={ref} className="arena-canvas" aria-label="DevQuest action battle" />
    </div>
  );
}
