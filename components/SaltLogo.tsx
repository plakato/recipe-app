// The "recepty" wordmark with a pinch of salt crystals sprinkled after it.
// Each grain drifts a little on hover, by a different amount.
// Small grains on top, bigger ones settling at the bottom.
const grains = [
  { x: 9, y: 1.5, s: 1.4, r: -15, o: 0.6, move: "group-hover:translate-y-1" },
  { x: 3, y: 4.5, s: 1.8, r: 20, o: 0.7, move: "group-hover:translate-y-0.5" },
  { x: 12.5, y: 8, s: 2.2, r: 40, o: 0.8, move: "group-hover:translate-y-1.5 group-hover:translate-x-0.5" },
  { x: 6, y: 11.5, s: 2.6, r: 10, o: 0.85, move: "group-hover:translate-y-1" },
  { x: 11, y: 15.5, s: 3.1, r: -30, o: 0.95, move: "group-hover:translate-y-0.5" },
  { x: 3.5, y: 19.5, s: 3.5, r: 25, o: 1, move: "group-hover:translate-y-0.5 group-hover:-translate-x-0.5" },
  { x: 13.5, y: 21, s: 2.8, r: 5, o: 0.9, move: "group-hover:translate-y-0.5" },
];

export default function SaltLogo() {
  return (
    <span className="inline-flex items-start text-2xl font-semibold lowercase tracking-[-0.04em]">
      recepty
      <svg viewBox="0 0 16 24" className="ml-0.5 h-6 w-4 overflow-visible text-blush-500" aria-hidden>
        {grains.map((g, i) => (
          <rect
            key={i}
            x={g.x - g.s / 2}
            y={g.y - g.s / 2}
            width={g.s}
            height={g.s}
            rx={0.3}
            fill="currentColor"
            opacity={g.o}
            transform={`rotate(${g.r} ${g.x} ${g.y})`}
            className={`transition-transform duration-300 ${g.move}`}
          />
        ))}
      </svg>
    </span>
  );
}
