// The "recepty" wordmark with a pinch of salt sprinkled after it.
// Several sprinkle styles live here while one gets picked (see /logo-lab).

type Grain = {
  x: number;
  y: number;
  s: number; // size
  r?: number; // rotation, degrees
  o?: number; // opacity
  grey?: boolean; // second tone
  shape?: "square" | "flake" | "outline";
};

type Variant = {
  name: string;
  hint: string;
  w: number; // viewBox width; height is 24 (= 1em), or 12 (= 0.5em) when "over"
  grains: Grain[];
  over?: boolean; // dusted over the word instead of after it
};

// Small deterministic pseudo-random, so layouts are stable between renders.
function rand(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const graded: Grain[] = [
  { x: 9, y: 1.5, s: 1.4, r: -15, o: 0.6 },
  { x: 3, y: 4.5, s: 1.8, r: 20, o: 0.7 },
  { x: 12.5, y: 8, s: 2.2, r: 40, o: 0.8 },
  { x: 6, y: 11.5, s: 2.6, r: 10, o: 0.85 },
  { x: 11, y: 15.5, s: 3.1, r: -30, o: 0.95 },
  { x: 3.5, y: 19.5, s: 3.5, r: 25 },
  { x: 13.5, y: 21, s: 2.8, r: 5, o: 0.9 },
];

export const variants: Record<string, Variant> = {
  graded: {
    name: "Graded sprinkle",
    hint: "Fine grains on top, bigger ones settled at the bottom (current)",
    w: 16,
    grains: graded,
  },
  pinch: {
    name: "Pinch",
    hint: "A tight little cluster at the baseline, like it was just dropped",
    w: 14,
    grains: [
      { x: 8, y: 12.5, s: 1.4, r: 30, o: 0.6 },
      { x: 11.5, y: 15.5, s: 1.7, r: -20, o: 0.75 },
      { x: 6.5, y: 15.5, s: 2.1, r: 12 },
      { x: 3, y: 18, s: 2.7, r: -25 },
      { x: 9, y: 18.5, s: 3.1, r: 40 },
      { x: 5.5, y: 21, s: 2.3, r: 5, o: 0.85 },
      { x: 12, y: 20.5, s: 1.8, r: -10, o: 0.7 },
    ],
  },
  heap: {
    name: "Little heap",
    hint: "Grains piled into a small pyramid, two still falling",
    w: 16,
    grains: [
      { x: 2.5, y: 20, s: 3 },
      { x: 6.2, y: 20, s: 3, r: 8 },
      { x: 9.9, y: 20, s: 3, r: -6 },
      { x: 13.6, y: 20, s: 3, r: 10 },
      { x: 4.3, y: 16.8, s: 2.6, r: 15 },
      { x: 8, y: 16.8, s: 2.6, r: -10 },
      { x: 11.7, y: 16.8, s: 2.6, r: 5 },
      { x: 6.1, y: 13.9, s: 2.2, r: 25 },
      { x: 9.8, y: 13.9, s: 2.2, r: -20 },
      { x: 8, y: 11.3, s: 1.8, r: 40 },
      { x: 9, y: 6.5, s: 1.5, r: 30, o: 0.7 },
      { x: 6.5, y: 2.5, s: 1.2, r: -15, o: 0.5 },
    ],
  },
  stream: {
    name: "Falling stream",
    hint: "A diagonal line of grains pouring down onto the word",
    w: 18,
    grains: Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      return {
        x: 16 - 13 * t + (i % 2 ? 0.8 : -0.8),
        y: 2 + 18 * t,
        s: 1.1 + 2.2 * t,
        r: i * 23,
        o: 0.5 + 0.5 * t,
      };
    }),
  },
  dusted: {
    name: "Dusted on top",
    hint: "Fine salt scattered over the tops of the letters",
    w: 90,
    over: true,
    grains: (() => {
      const r = rand(7);
      return Array.from({ length: 16 }, () => ({
        x: 3 + r() * 84,
        y: 2 + r() * 8,
        s: 1 + r() * 1.4,
        r: r() * 90,
        o: 0.5 + r() * 0.5,
      }));
    })(),
  },
  flakes: {
    name: "Sea-salt flakes",
    hint: "Flat triangular flakes (like Maldon salt) instead of cubes",
    w: 17,
    grains: [
      { x: 9, y: 2.5, s: 2, r: 10, o: 0.6, shape: "flake" },
      { x: 3.5, y: 6.5, s: 2.6, r: -25, o: 0.7, shape: "flake" },
      { x: 13, y: 10, s: 3, r: 35, o: 0.8, shape: "flake" },
      { x: 6.5, y: 14, s: 3.6, r: -5, o: 0.9, shape: "flake" },
      { x: 12, y: 18.5, s: 4.2, r: 20, shape: "flake" },
      { x: 3.5, y: 20, s: 3.4, r: -40, o: 0.9, shape: "flake" },
    ],
  },
  outline: {
    name: "Outlined crystals",
    hint: "The graded sprinkle, drawn as hollow line crystals",
    w: 16,
    grains: graded.map((g) => ({ ...g, s: g.s + 0.4, shape: "outline" as const })),
  },
  trail: {
    name: "Trailing off",
    hint: "Grains along the baseline, getting smaller, like an ellipsis",
    w: 22,
    grains: [
      { x: 3, y: 18.5, s: 3.4, r: 15 },
      { x: 8, y: 19.2, s: 2.8, r: -20, o: 0.9 },
      { x: 12.5, y: 18.3, s: 2.2, r: 35, o: 0.8 },
      { x: 16.5, y: 19, s: 1.7, r: 5, o: 0.65 },
      { x: 20, y: 18.4, s: 1.3, r: -30, o: 0.5 },
    ],
  },
  twotone: {
    name: "Salt & pepper",
    hint: "The graded sprinkle in pink and warm grey",
    w: 16,
    grains: graded.map((g, i) => ({ ...g, grey: i % 3 === 1 })),
  },
  burst: {
    name: "Shaker burst",
    hint: "Grains fanning up and out from one point, mid-shake",
    w: 18,
    grains: (() => {
      const r = rand(3);
      return Array.from({ length: 9 }, (_, i) => {
        const angle = ((15 + i * 8.5) * Math.PI) / 180;
        const dist = 5 + r() * 11;
        return {
          x: 1.5 + Math.cos(angle) * dist,
          y: 21 - Math.sin(angle) * dist,
          s: 3.2 - dist * 0.14,
          r: r() * 90,
          o: 1 - dist * 0.03,
        };
      });
    })(),
  },
};

export type SaltVariant = keyof typeof variants;

// Hover: every grain drifts a little, each by a different amount.
const drift = [
  "group-hover:translate-y-0.5",
  "group-hover:translate-y-1",
  "group-hover:translate-y-0.5 group-hover:translate-x-0.5",
  "group-hover:translate-y-1 group-hover:-translate-x-0.5",
];

function GrainShape({ g, i }: { g: Grain; i: number }) {
  const common = {
    opacity: g.o ?? 1,
    transform: `rotate(${g.r ?? 0} ${g.x} ${g.y})`,
    className: `transition-transform duration-300 ${drift[i % drift.length]}`,
  };
  const color = g.grey ? "#a8a29e" : "currentColor";
  if (g.shape === "flake") {
    const h = g.s * 0.87;
    return (
      <polygon
        {...common}
        fill={color}
        points={`${g.x},${g.y - h / 1.5} ${g.x + g.s / 2},${g.y + h / 3} ${g.x - g.s / 2},${g.y + h / 3}`}
      />
    );
  }
  const box = { x: g.x - g.s / 2, y: g.y - g.s / 2, width: g.s, height: g.s, rx: 0.3 };
  if (g.shape === "outline") {
    return <rect {...common} {...box} fill="none" stroke={color} strokeWidth={0.6} />;
  }
  return <rect {...common} {...box} fill={color} />;
}

export default function SaltLogo({ variant = "graded" }: { variant?: SaltVariant }) {
  const v = variants[variant];
  const svg = (
    <svg
      viewBox={`0 0 ${v.w} ${v.over ? 12 : 24}`}
      style={{ height: v.over ? "0.5em" : "1em", width: `${v.w / 24}em` }}
      className={`overflow-visible text-blush-500 ${
        v.over ? "pointer-events-none absolute -top-[0.3em] left-0" : "ml-[0.05em]"
      }`}
      aria-hidden
    >
      {v.grains.map((g, i) => (
        <GrainShape key={i} g={g} i={i} />
      ))}
    </svg>
  );
  return (
    <span className="relative inline-flex items-start font-semibold lowercase tracking-[-0.04em]">
      recepty
      {svg}
    </span>
  );
}
