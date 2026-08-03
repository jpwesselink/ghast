import { useEffect, useRef, useState } from "react";

export default function Ghost({
  size = 96,
  bodyColor = "#1a1a1a",
  bodyOpacity = 1,
  eyeMilkColor = "#d8d2c4",
  eyeMilkScale = 1,
  glow,
}: {
  size?: number;
  bodyColor?: string;
  bodyOpacity?: number;
  eyeMilkColor?: string;
  eyeMilkScale?: number;
  glow?: string;
}) {
  const milkRx = 3.2 * eyeMilkScale;
  const milkRy = 4.4 * eyeMilkScale;
  const svgRef = useRef<SVGSVGElement>(null);
  const [leftOff, setLeftOff] = useState({ x: 0, y: 0 });
  const [rightOff, setRightOff] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = rect.width / 100;
      const sy = rect.height / 100;

      // Eye-socket centers, in viewBox coords (40,45) and (60,45).
      // Translate them to screen-space so we can aim at the cursor.
      const eyes: Array<[number, number, (o: { x: number; y: number }) => void]> = [
        [rect.left + 40 * sx, rect.top + 45 * sy, setLeftOff],
        [rect.left + 60 * sx, rect.top + 45 * sy, setRightOff],
      ];

      const maxX = 1.4;
      const maxY = 1.8;
      const saturationPx = 220; // distance at which the pupil reaches its max deflection

      for (const [ex, ey, set] of eyes) {
        const dx = e.clientX - ex;
        const dy = e.clientY - ey;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) {
          set({ x: 0, y: 0 });
          continue;
        }
        const factor = Math.min(1, dist / saturationPx);
        set({
          x: (dx / dist) * maxX * factor,
          y: (dy / dist) * maxY * factor,
        });
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <radialGradient id="ghastEyeMilk" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={eyeMilkColor} stopOpacity="0.95" />
          <stop offset="70%" stopColor={eyeMilkColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={eyeMilkColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M50 8 C30 8 18 24 18 50 L18 90 L25 84 L32 90 L40 84 L50 90 L60 84 L68 90 L75 84 L82 90 L82 50 C82 24 70 8 50 8 Z"
        fill={bodyColor}
        opacity={bodyOpacity}
        style={glow ? { filter: `drop-shadow(0 0 18px ${glow}) drop-shadow(0 0 36px ${glow})` } : undefined}
      />
      <g>
        <ellipse cx="40" cy="45" rx="5" ry="7" fill="#000" opacity="0.85" />
        <g transform={`translate(${leftOff.x} ${leftOff.y})`}>
          <ellipse cx="40" cy="46.5" rx={milkRx} ry={milkRy} fill="url(#ghastEyeMilk)" />
        </g>
        <ellipse cx="60" cy="45" rx="5" ry="7" fill="#000" opacity="0.85" />
        <g transform={`translate(${rightOff.x} ${rightOff.y})`}>
          <ellipse cx="60" cy="46.5" rx={milkRx} ry={milkRy} fill="url(#ghastEyeMilk)" />
        </g>
      </g>
    </svg>
  );
}
