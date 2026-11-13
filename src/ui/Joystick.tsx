import { useRef, useState } from "react";

export function Joystick({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const area = useRef<HTMLDivElement | null>(null);
  const active = useRef(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function vector(e: { clientX: number; clientY: number }) {
    const box = area.current?.getBoundingClientRect();
    if (!box) return { dx: 0, dy: 0 };
    let dx = (e.clientX - (box.left + box.width / 2)) / (box.width / 2);
    let dy = (e.clientY - (box.top + box.height / 2)) / (box.height / 2);
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    return { dx, dy };
  }

  function release() {
    if (!active.current) return;
    active.current = false;
    setPos({ x: 0, y: 0 });
    onMove(0, 0);
  }

  return (
    <div
      className="joy"
      ref={area}
      role="application"
      aria-label="Move joystick"
      onPointerDown={(e) => {
        active.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const { dx, dy } = vector(e);
        setPos({ x: dx * 22, y: dy * 22 });
        onMove(dx, dy);
      }}
      onPointerMove={(e) => {
        if (!active.current) return;
        const { dx, dy } = vector(e);
        setPos({ x: dx * 22, y: dy * 22 });
        onMove(dx, dy);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <i style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
    </div>
  );
}
