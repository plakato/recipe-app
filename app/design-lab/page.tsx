// Temporary: round 2 — ten editorial directions (serif titles, paper tones,
// dark accents), each with its own logo mark and layout, using real recipes.
import {
  Bodoni_Moda,
  DM_Serif_Display,
  Figtree,
  Fraunces,
  Gloock,
  Hanken_Grotesk,
  Instrument_Sans,
  Instrument_Serif,
  Inter_Tight,
  Libre_Caslon_Text,
  Newsreader,
  Schibsted_Grotesk,
  Young_Serif,
} from "next/font/google";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const instrumentSerif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", style: ["normal", "italic"] });
const instrumentSans = Instrument_Sans({ subsets: ["latin", "latin-ext"] });
const newsreader = Newsreader({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"] });
const gloock = Gloock({ subsets: ["latin", "latin-ext"], weight: "400" });
const bodoni = Bodoni_Moda({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"] });
const dmSerif = DM_Serif_Display({ subsets: ["latin", "latin-ext"], weight: "400" });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"] });
const youngSerif = Young_Serif({ subsets: ["latin", "latin-ext"], weight: "400" });
const caslon = Libre_Caslon_Text({ subsets: ["latin", "latin-ext"], weight: ["400", "700"] });
const hanken = Hanken_Grotesk({ subsets: ["latin", "latin-ext"] });
const schibsted = Schibsted_Grotesk({ subsets: ["latin", "latin-ext"] });
const figtree = Figtree({ subsets: ["latin", "latin-ext"] });
const interTight = Inter_Tight({ subsets: ["latin", "latin-ext"] });

type R = { id: string; title: string; imagePath: string | null };

function Img({ r, className = "", empty }: { r: R; className?: string; empty: string }) {
  return r.imagePath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.imagePath} alt="" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`h-full w-full ${empty}`} />
  );
}

const serif = (f: { style: { fontFamily: string } }, italic = false) => ({
  fontFamily: f.style.fontFamily,
  ...(italic ? { fontStyle: "italic" as const } : {}),
});

type Version = {
  name: string;
  about: string;
  frame: string;
  sans: string;
  header: string;
  logo: React.ReactElement;
  plus: string;
  avatar: string;
  body: (rs: R[]) => React.ReactElement;
};

const versions: Version[] = [
  {
    name: "Pine",
    about: "The closest to no. 8, cleaner: Instrument Serif, bone paper, pine green, bowl-and-spoon mark",
    frame: "bg-[#F6F4EE] text-[#141414]",
    sans: instrumentSans.className,
    header: "border-b border-black/10",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <path d="M6 20h28a14 14 0 0 1-28 0Z" fill="#1F4D3A" />
        <path d="M24 16 33 5" stroke="#1F4D3A" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    plus: "bg-[#1F4D3A] text-[#F6F4EE]",
    avatar: "ring-1 ring-[#1F4D3A]/40 text-[#1F4D3A]",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 p-5 sm:grid-cols-3">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id} className="group">
            <div className="aspect-[3/4] overflow-hidden">
              <Img r={r} empty="bg-[#E4E9E1]" className="transition duration-700 group-hover:scale-[1.03]" />
            </div>
            <p className="mt-3 line-clamp-2 text-2xl leading-[1.1]" style={serif(instrumentSerif)}>
              {r.title}
            </p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Masonry",
    about: "Newsreader italic + Inter Tight, white, olive · uneven columns of different photo heights (Pinterest-like)",
    frame: "bg-white text-[#171717]",
    sans: interTight.className,
    header: "border-b border-black/5",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <circle cx="20" cy="20" r="15" fill="none" stroke="#56642C" strokeWidth="2.5" />
        <path d="M5 22h30" stroke="#56642C" strokeWidth="2.5" />
      </svg>
    ),
    plus: "bg-[#171717] text-white",
    avatar: "bg-[#EEF0E6] text-[#56642C]",
    body: (rs) => (
      <div className="columns-2 gap-4 p-5 sm:columns-3">
        {rs.slice(0, 7).map((r, i) => (
          <div key={r.id} className="mb-6 break-inside-avoid">
            <div className={`overflow-hidden rounded-md ${["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[2/3]"][i % 4]}`}>
              <Img r={r} empty="bg-[#EEF0E6]" />
            </div>
            <p className="mt-2 line-clamp-2 text-lg leading-snug" style={serif(newsreader, true)}>
              {r.title}
            </p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Feature",
    about: "Gloock + Hanken Grotesk, warm paper, oxblood · newest recipe as a big feature, the rest in a small grid",
    frame: "bg-[#F2EFE8] text-[#151515]",
    sans: hanken.className,
    header: "border-b border-black/10",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <rect width="40" height="40" fill="#151515" />
        <text x="20" y="29" textAnchor="middle" fontSize="26" fill="#F2EFE8" style={serif(gloock)}>
          r
        </text>
      </svg>
    ),
    plus: "bg-[#6B1F2A] text-white",
    avatar: "bg-[#151515] text-[#F2EFE8]",
    body: (rs) => (
      <div className="space-y-8 p-5">
        <div className="grid gap-5 sm:grid-cols-[3fr_2fr] sm:items-end">
          <div className="aspect-[4/3] overflow-hidden">
            <Img r={rs[0]} empty="bg-[#E6DED2]" />
          </div>
          <div>
            <p className="font-mono text-xs text-[#6B1F2A]">Newest</p>
            <p className="mt-2 text-4xl leading-[1.05] sm:text-5xl" style={serif(gloock)}>
              {rs[0].title}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-t border-black/10 pt-6 sm:grid-cols-4">
          {rs.slice(1, 5).map((r) => (
            <div key={r.id}>
              <div className="aspect-square overflow-hidden">
                <Img r={r} empty="bg-[#E6DED2]" />
              </div>
              <p className="mt-2 line-clamp-2 text-lg leading-tight" style={serif(gloock)}>
                {r.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "Index",
    about: "Bodoni Moda + Inter Tight, white, ink blue · a numbered index of big titles, small photo on the right",
    frame: "bg-white text-[#10182B]",
    sans: interTight.className,
    header: "border-b border-[#10182B]",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <text x="4" y="30" fontSize="30" fill="#10182B" style={serif(bodoni, true)}>
          R
        </text>
        <circle cx="31" cy="27" r="3.2" fill="#2D4E9A" />
      </svg>
    ),
    plus: "bg-[#10182B] text-white",
    avatar: "ring-1 ring-[#10182B] text-[#10182B]",
    body: (rs) => (
      <ol className="px-5">
        {rs.slice(0, 6).map((r, i) => (
          <li key={r.id} className="group flex items-center gap-4 border-b border-[#10182B]/15 py-4 last:border-0">
            <span className="w-8 font-mono text-xs text-[#2D4E9A]">{String(i + 1).padStart(2, "0")}</span>
            <p className="min-w-0 flex-1 text-2xl leading-tight sm:text-4xl" style={serif(bodoni)}>
              <span className="line-clamp-2 transition group-hover:italic">{r.title}</span>
            </p>
            <div className="h-16 w-16 flex-none overflow-hidden sm:h-20 sm:w-28">
              <Img r={r} empty="bg-[#E5EAF4]" />
            </div>
          </li>
        ))}
      </ol>
    ),
  },
  {
    name: "Dark Editorial",
    about: "Instrument Serif on charcoal, bone text · full-bleed square photos with the serif title on the photo",
    frame: "bg-[#111111] text-[#EDE9E0]",
    sans: instrumentSans.className,
    header: "border-b border-white/10",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <circle cx="20" cy="20" r="15" fill="none" stroke="#EDE9E0" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="5" fill="#C9B98F" />
      </svg>
    ),
    plus: "bg-[#EDE9E0] text-[#111]",
    avatar: "bg-white/10 text-[#EDE9E0]",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id} className="relative aspect-square overflow-hidden">
            <Img r={r} empty="bg-[#222]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
            <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-3 text-2xl leading-[1.05] text-white" style={serif(instrumentSerif)}>
              {r.title}
            </p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Headline First",
    about: "DM Serif Display + Schibsted Grotesk, sand, deep forest · the title comes first, the photo underneath it",
    frame: "bg-[#EEE9DF] text-[#1B1B1B]",
    sans: schibsted.className,
    header: "border-b border-black/10",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <path d="M6 22h28a14 14 0 0 1-28 0Z" fill="#243B2F" />
        <path d="M6 18h28a14 14 0 0 0-28 0Z" fill="none" stroke="#243B2F" strokeWidth="2" />
        <circle cx="20" cy="4" r="2" fill="#243B2F" />
      </svg>
    ),
    plus: "bg-[#243B2F] text-[#EEE9DF]",
    avatar: "bg-[#DDD5C6] text-[#243B2F]",
    body: (rs) => (
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 p-5 sm:grid-cols-3">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id}>
            <p className="mb-3 line-clamp-2 min-h-[2.2em] text-3xl leading-[1.05]" style={serif(dmSerif)}>
              {r.title}
            </p>
            <div className="aspect-[4/3] overflow-hidden rounded-sm">
              <Img r={r} empty="bg-[#DDD5C6]" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Soft Modern",
    about: "Fraunces + Figtree, off-white, aubergine · rounded photos, a round arrow button tucked into the corner",
    frame: "bg-[#F7F5F0] text-[#221B26]",
    sans: figtree.className,
    header: "",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <rect width="40" height="40" rx="20" fill="#3E2A47" />
        <text x="20" y="28" textAnchor="middle" fontSize="22" fill="#F7F5F0" style={serif(fraunces, true)}>
          r
        </text>
      </svg>
    ),
    plus: "bg-[#3E2A47] text-white",
    avatar: "bg-[#E9E3EC] text-[#3E2A47]",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 p-5 sm:grid-cols-3">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id} className="group">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
              <Img r={r} empty="bg-[#E9E3EC]" />
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F5F0] text-[#3E2A47] transition group-hover:bg-[#3E2A47] group-hover:text-white">
                ↗
              </span>
            </div>
            <p className="mt-3 line-clamp-2 px-1 text-xl leading-tight" style={serif(fraunces)}>
              {r.title}
            </p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Book Covers",
    about: "Young Serif + Instrument Sans, bone · photo on top, title on a solid colour block like a book spine",
    frame: "bg-[#F4F1EA] text-[#141414]",
    sans: instrumentSans.className,
    header: "border-b border-black/10",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <path d="M20 11c-4-3-9-3-14-2v21c5-1 10-1 14 2 4-3 9-3 14-2V9c-5-1-10-1-14 2Z" fill="none" stroke="#1F4D3A" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M20 11v21" stroke="#1F4D3A" strokeWidth="2.5" />
      </svg>
    ),
    plus: "bg-[#1F4D3A] text-white",
    avatar: "bg-[#E4DED2] text-[#1F4D3A]",
    body: (rs) => {
      const tones = ["bg-[#1F4D3A]", "bg-[#1D3557]", "bg-[#5E2129]", "bg-[#2E2A26]"];
      return (
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
          {rs.slice(0, 6).map((r, i) => (
            <div key={r.id} className="overflow-hidden rounded-sm">
              <div className="aspect-square">
                <Img r={r} empty="bg-[#E4DED2]" />
              </div>
              <div className={`${tones[i % tones.length]} flex min-h-[5.5rem] items-end p-3 text-[#F4F1EA]`}>
                <p className="line-clamp-3 text-lg leading-tight" style={serif(youngSerif)}>
                  {r.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    name: "Gallery",
    about: "Libre Caslon + Inter Tight, pure white, black · photos in black & white that turn to colour on hover",
    frame: "bg-white text-black",
    sans: interTight.className,
    header: "",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <circle cx="14" cy="20" r="8" fill="#000" />
        <rect x="24" y="12" width="12" height="16" fill="none" stroke="#000" strokeWidth="2" />
      </svg>
    ),
    plus: "bg-black text-white",
    avatar: "ring-1 ring-black text-black",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 p-6 sm:grid-cols-3">
        {rs.slice(0, 6).map((r, i) => (
          <div key={r.id} className="group">
            <div className="aspect-[4/5] overflow-hidden">
              <Img r={r} empty="bg-[#EFEFEF]" className="grayscale transition duration-500 group-hover:grayscale-0" />
            </div>
            <div className="mt-3 flex gap-3">
              <span className="pt-1 font-mono text-[10px] text-black/40">{String(i + 1).padStart(3, "0")}</span>
              <p className="line-clamp-2 text-lg leading-snug" style={serif(caslon)}>
                {r.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Zig-zag",
    about: "Instrument Serif, bone, ink · wide rows: photo and big title side by side, alternating left and right",
    frame: "bg-[#F6F4EE] text-[#141414]",
    sans: instrumentSans.className,
    header: "border-b border-black/10",
    logo: (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx="20" cy="11" rx="3.2" ry="8" fill="#141414" transform={`rotate(${i * 45} 20 20)`} />
        ))}
        <circle cx="20" cy="20" r="3" fill="#F6F4EE" />
      </svg>
    ),
    plus: "bg-[#141414] text-[#F6F4EE]",
    avatar: "bg-[#E8E4DA] text-[#141414]",
    body: (rs) => (
      <div className="divide-y divide-black/10 px-5">
        {rs.slice(0, 4).map((r, i) => (
          <div key={r.id} className={`flex items-center gap-5 py-5 sm:gap-10 ${i % 2 ? "flex-row-reverse" : ""}`}>
            <div className="aspect-[4/3] w-1/2 flex-none overflow-hidden">
              <Img r={r} empty="bg-[#E8E4DA]" />
            </div>
            <p className={`text-2xl leading-[1.05] sm:text-5xl ${i % 2 ? "text-right" : ""}`} style={serif(instrumentSerif)}>
              {r.title}
            </p>
          </div>
        ))}
      </div>
    ),
  },
];

const PlusGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default async function DesignLab() {
  const userId = await requireUserId();
  const all = await prisma.recipe.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, imagePath: true },
  });
  // Recipes with different photos, plus one without a photo if there is one.
  const seen = new Set<string>();
  const withImages = all.filter((r) => {
    if (!r.imagePath || seen.has(r.imagePath)) return false;
    seen.add(r.imagePath);
    return true;
  });
  const noImage = all.find((r) => !r.imagePath);
  const sample = [...withImages.slice(0, 5), ...(noImage ? [noImage] : []), ...withImages.slice(5, 7)];

  return (
    <div className="space-y-14 py-4">
      <div>
        <h1 className="text-3xl font-semibold">Round 2 · around no. 8</h1>
        <p className="mt-1 text-sm text-stone-500">Editorial feel, ten takes. Tell me what works in which.</p>
      </div>
      {versions.map((v, n) => (
        <section key={v.name}>
          <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-semibold">
              {n + 1}. {v.name}
            </span>
            <span className="text-sm text-stone-500">{v.about}</span>
          </h2>
          <div className={`overflow-hidden rounded-2xl ring-1 ring-black/10 ${v.frame} ${v.sans}`}>
            <div className={`flex items-center justify-between px-5 py-3 ${v.header}`}>
              {v.logo}
              <div className="flex items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${v.plus}`}>
                  <PlusGlyph />
                </span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${v.avatar}`}>
                  B
                </span>
              </div>
            </div>
            {v.body(sample)}
          </div>
        </section>
      ))}
    </div>
  );
}
