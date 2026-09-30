// Temporary: round 3 — app-style sans fonts, kitchen-object logos, squared
// buttons; half the versions mix card sizes, half keep an even grid.
import {
  Albert_Sans,
  Figtree,
  Geist,
  Inter,
  Lexend,
  Nunito_Sans,
  Outfit,
  Public_Sans,
  Rubik,
  Urbanist,
} from "next/font/google";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin", "latin-ext"] });
const geist = Geist({ subsets: ["latin", "latin-ext"] });
const figtree = Figtree({ subsets: ["latin", "latin-ext"] });
const rubik = Rubik({ subsets: ["latin", "latin-ext"] });
const outfit = Outfit({ subsets: ["latin", "latin-ext"] });
const urbanist = Urbanist({ subsets: ["latin", "latin-ext"] });
const albert = Albert_Sans({ subsets: ["latin", "latin-ext"] });
const publicSans = Public_Sans({ subsets: ["latin", "latin-ext"] });
const nunito = Nunito_Sans({ subsets: ["latin", "latin-ext"] });
const lexend = Lexend({ subsets: ["latin", "latin-ext"] });

type R = { id: string; title: string; imagePath: string | null };

function Img({ r, className = "", empty }: { r: R; className?: string; empty: string }) {
  return r.imagePath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.imagePath} alt="" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`h-full w-full ${empty}`} />
  );
}

// ---------- Kitchen glyphs (24×24, filled with currentColor) ----------
const G = ({ children, className = "h-6 w-6" }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    {children}
  </svg>
);
const glyph = {
  pot: (
    <G>
      <circle cx="12" cy="5.5" r="1.6" />
      <rect x="3" y="8" width="18" height="2.4" rx="1.2" />
      <path d="M5 11.5h14V17a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 17Z" />
      <rect x="1.5" y="12.5" width="4" height="2.2" rx="1.1" />
      <rect x="18.5" y="12.5" width="4" height="2.2" rx="1.1" />
    </G>
  ),
  hat: (
    <G>
      <path d="M6.5 16.5v-3.3A4.3 4.3 0 0 1 7.6 4.9a5 5 0 0 1 8.8 0 4.3 4.3 0 0 1 1.1 8.3v3.3Z" />
      <rect x="6.5" y="18" width="11" height="2.8" rx="0.8" />
    </G>
  ),
  whisk: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M12 14.5C5.5 11 6.5 1.8 12 1.8s6.5 9.2 0 12.7Z" />
      <path d="M12 14.5C9 11 9.3 1.8 12 1.8s3 9.2 0 12.7Z" />
      <path d="M12 1.8v12.7" />
      <path d="M12 15v7" strokeWidth="3" />
    </svg>
  ),
  pan: (
    <G>
      <circle cx="9.5" cy="11.5" r="8" />
      <path d="M8.7 7.3c-2.4.3-3.9 2.3-3.5 4.4.4 2.4 2.9 3.6 5 3 1.9-.5 3.5-1.5 3.4-3.6-.1-2.4-2.3-4.1-4.9-3.8Z" fill="#fff" />
      <circle cx="9.4" cy="11.2" r="1.9" fill="#E8C468" />
      <rect x="16.5" y="10.2" width="7" height="2.6" rx="1.3" />
    </G>
  ),
  cutlery: (
    <G>
      <path d="M5 2.5a.8.8 0 0 1 1.6 0V7h1V2.5a.8.8 0 0 1 1.6 0V7h1V2.5a.8.8 0 0 1 1.6 0V8a3 3 0 0 1-2.2 2.9V20.5a1.2 1.2 0 0 1-2.4 0V10.9A3 3 0 0 1 5 8Z" />
      <path d="M17.5 2c2.2 1 3.3 4.2 3.3 8.3v1.2h-2.3v9a1.2 1.2 0 0 1-2.4 0V3.2c0-.8.7-1.4 1.4-1.2Z" />
    </G>
  ),
  bowl: (
    <G>
      <path d="M17.4 3.4a1 1 0 0 1 1.5 1.3L15 9.5h-2.6Z" />
      <path d="M2.5 10.5h19a1 1 0 0 1 1 1.1A10.5 9 0 0 1 12 20.5 10.5 9 0 0 1 1.5 11.6a1 1 0 0 1 1-1.1Z" />
    </G>
  ),
  spatula: (
    <G>
      <path d="M8.5 1.5h7a2 2 0 0 1 2 2V10a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3V3.5a2 2 0 0 1 2-2Zm1.3 2.5v6h1.2V4Zm3.2 0v6h1.2V4Z" fillRule="evenodd" />
      <rect x="10.7" y="12.5" width="2.6" height="10" rx="1.3" />
    </G>
  ),
  ladle: (
    <G>
      <path d="M16.3 2a2.7 2.7 0 0 1 2.7 2.7v.5h-2.2v-.5a.5.5 0 0 0-1 0V12h-2.2V4.7A2.7 2.7 0 0 1 16.3 2Z" />
      <path d="M4 12h16a1 1 0 0 1 1 1.1 9 8 0 0 1-18 0A1 1 0 0 1 4 12Z" />
    </G>
  ),
  pin: (
    <G>
      <rect x="3.5" y="8.4" width="17" height="7.2" rx="3.6" transform="rotate(-35 12 12)" />
      <rect x="-1" y="10.8" width="5.2" height="2.4" rx="1.2" transform="rotate(-35 12 12)" />
      <rect x="19.8" y="10.8" width="5.2" height="2.4" rx="1.2" transform="rotate(-35 12 12)" />
    </G>
  ),
  mortar: (
    <G>
      <rect x="11.5" y="1.2" width="3.2" height="11" rx="1.6" transform="rotate(30 13 7)" />
      <path d="M3 11h18l-1.4 5.4A4 4 0 0 1 15.7 19.5H8.3a4 4 0 0 1-3.9-3.1Z" />
      <rect x="7" y="20.3" width="10" height="2.2" rx="1.1" />
    </G>
  ),
};

const PlusGlyph = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// ---------- Versions ----------
type Version = {
  name: string;
  about: string;
  font: string;
  frame: string;
  header: string;
  logo: React.ReactElement;
  add: React.ReactElement; // the "new recipe" control
  avatar: string;
  body: (rs: R[]) => React.ReactElement;
};

const title = "line-clamp-2 leading-snug";

const versions: Version[] = [
  {
    name: "Pot · Inter",
    about: "Even grid · bone + pine · tall photos, title below · labelled button",
    font: inter.className,
    frame: "bg-[#F6F4EE] text-[#171717]",
    header: "border-b border-black/10",
    logo: <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F4D3A] text-[#F6F4EE]">{glyph.pot}</span>,
    add: (
      <span className="flex h-9 items-center gap-1.5 rounded-lg bg-[#1F4D3A] px-3 text-sm font-medium text-white">
        <PlusGlyph /> New recipe
      </span>
    ),
    avatar: "rounded-lg bg-[#E6E2D8] text-[#1F4D3A]",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-5 sm:grid-cols-3">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id}>
            <div className="aspect-[4/5] overflow-hidden rounded-xl">
              <Img r={r} empty="bg-[#E4E9E1]" />
            </div>
            <p className={`mt-2.5 text-[15px] font-semibold ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Chef's hat · Geist",
    about: "Mixed sizes (bento) · white + ink + olive · newest recipe takes a 2×2 tile",
    font: geist.className,
    frame: "bg-white text-[#111]",
    header: "border-b border-black/5",
    logo: <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111] text-white">{glyph.hat}</span>,
    add: (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5F6F2E] text-white">
        <PlusGlyph />
      </span>
    ),
    avatar: "rounded-lg bg-[#F0F1EA] text-[#111]",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        {rs.slice(0, 9).map((r, i) => (
          <div key={r.id} className={`relative overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2" : ""} aspect-square`}>
            <Img r={r} empty="bg-[#EEF0E6]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent" />
            <p className={`absolute inset-x-0 bottom-0 p-3 font-semibold text-white ${i === 0 ? "text-2xl" : "text-sm"} ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Whisk · Figtree",
    about: "Mixed sizes (masonry) · warm paper + oxblood · uneven photo heights, title below",
    font: figtree.className,
    frame: "bg-[#F2EFE8] text-[#1A1A1A]",
    header: "border-b border-black/10",
    logo: <span className="text-[#6B1F2A]">{glyph.whisk}</span>,
    add: (
      <span className="flex h-9 items-center gap-1.5 rounded-lg border border-[#6B1F2A]/30 px-3 text-sm font-semibold text-[#6B1F2A]">
        <PlusGlyph /> Add
      </span>
    ),
    avatar: "rounded-lg bg-[#6B1F2A] text-white",
    body: (rs) => (
      <div className="columns-2 gap-4 p-5 sm:columns-3">
        {rs.slice(0, 7).map((r, i) => (
          <div key={r.id} className="mb-5 break-inside-avoid">
            <div className={`overflow-hidden rounded-lg ${["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[2/3]"][i % 4]}`}>
              <Img r={r} empty="bg-[#E6DED2]" />
            </div>
            <p className={`mt-2 font-semibold ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Frying pan · Rubik",
    about: "Even grid · dark app with egg-yolk yellow · square photos, title on the photo",
    font: rubik.className,
    frame: "bg-[#121212] text-[#F2EFE8]",
    header: "border-b border-white/10",
    logo: <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8C468] text-[#121212]">{glyph.pan}</span>,
    add: (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8C468] text-[#121212]">
        <PlusGlyph />
      </span>
    ),
    avatar: "rounded-lg bg-white/10 text-[#F2EFE8]",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id} className="relative aspect-square overflow-hidden rounded-lg">
            <Img r={r} empty="bg-[#222]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
            <p className={`absolute inset-x-0 bottom-0 p-3 font-medium text-white ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Knife & fork · Outfit",
    about: "Mixed sizes (feature) · sand + forest green · newest recipe big, the rest in a grid",
    font: outfit.className,
    frame: "bg-[#EEE9DF] text-[#1B1B1B]",
    header: "border-b border-black/10",
    logo: <span className="text-[#243B2F]">{glyph.cutlery}</span>,
    add: (
      <span className="flex h-9 items-center gap-1.5 rounded-lg bg-[#243B2F] px-3 text-sm font-medium text-[#EEE9DF]">
        <PlusGlyph /> New
      </span>
    ),
    avatar: "rounded-lg bg-[#DDD5C6] text-[#243B2F]",
    body: (rs) => (
      <div className="space-y-6 p-5">
        <div className="grid gap-4 sm:grid-cols-[3fr_2fr] sm:items-end">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl">
            <Img r={rs[0]} empty="bg-[#DDD5C6]" />
          </div>
          <p className="text-3xl font-semibold leading-tight sm:text-4xl">{rs[0].title}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {rs.slice(1, 5).map((r) => (
            <div key={r.id}>
              <div className="aspect-square overflow-hidden rounded-xl">
                <Img r={r} empty="bg-[#DDD5C6]" />
              </div>
              <p className={`mt-2 font-medium ${title}`}>{r.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "Mixing bowl · Urbanist",
    about: "Even rows · white + navy · compact app list: thumbnail left, title right, two columns",
    font: urbanist.className,
    frame: "bg-white text-[#14213D]",
    header: "border-b border-[#14213D]/10",
    logo: <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1D3557] text-white">{glyph.bowl}</span>,
    add: (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1D3557] text-white">
        <PlusGlyph />
      </span>
    ),
    avatar: "rounded-lg bg-[#E8EDF5] text-[#1D3557]",
    body: (rs) => (
      <div className="grid grid-cols-1 gap-x-6 p-4 sm:grid-cols-2">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id} className="flex items-center gap-4 border-b border-[#14213D]/10 py-3">
            <div className="h-16 w-16 flex-none overflow-hidden rounded-lg">
              <Img r={r} empty="bg-[#E8EDF5]" />
            </div>
            <p className={`font-bold ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Spatula · Albert Sans",
    about: "Mixed sizes (rhythm) · off-white + aubergine · a row of two big, then a row of three small",
    font: albert.className,
    frame: "bg-[#F7F5F0] text-[#221B26]",
    header: "",
    logo: <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3E2A47] text-[#F7F5F0]">{glyph.spatula}</span>,
    add: (
      <span className="flex h-9 items-center gap-1.5 rounded-lg bg-[#3E2A47] px-3 text-sm font-medium text-white">
        <PlusGlyph /> New recipe
      </span>
    ),
    avatar: "rounded-lg bg-[#E9E3EC] text-[#3E2A47]",
    body: (rs) => (
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-4">
          {rs.slice(0, 2).map((r) => (
            <div key={r.id}>
              <div className="aspect-[4/3] overflow-hidden rounded-xl">
                <Img r={r} empty="bg-[#E9E3EC]" />
              </div>
              <p className={`mt-2.5 text-lg font-semibold ${title}`}>{r.title}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {rs.slice(2, 5).map((r) => (
            <div key={r.id}>
              <div className="aspect-square overflow-hidden rounded-xl">
                <Img r={r} empty="bg-[#E9E3EC]" />
              </div>
              <p className={`mt-2 text-sm font-semibold ${title}`}>{r.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "Ladle · Public Sans",
    about: "Mixed sizes (app shelves) · bone + deep teal · a swipeable row of big newest cards, then a grid",
    font: publicSans.className,
    frame: "bg-[#F6F4EE] text-[#132A2A]",
    header: "border-b border-black/10",
    logo: <span className="text-[#0F4C4C]">{glyph.ladle}</span>,
    add: (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F4C4C] text-white">
        <PlusGlyph />
      </span>
    ),
    avatar: "rounded-lg bg-[#DDE8E6] text-[#0F4C4C]",
    body: (rs) => (
      <div className="space-y-5 py-5">
        <p className="px-5 text-xs font-semibold uppercase tracking-wider text-[#0F4C4C]">Newest</p>
        <div className="flex gap-4 overflow-x-auto px-5 pb-1">
          {rs.slice(0, 4).map((r) => (
            <div key={r.id} className="w-64 flex-none">
              <div className="aspect-[4/3] overflow-hidden rounded-xl">
                <Img r={r} empty="bg-[#DDE8E6]" />
              </div>
              <p className={`mt-2 font-semibold ${title}`}>{r.title}</p>
            </div>
          ))}
        </div>
        <p className="px-5 pt-2 text-xs font-semibold uppercase tracking-wider text-[#0F4C4C]">All recipes</p>
        <div className="grid grid-cols-3 gap-3 px-5 sm:grid-cols-5">
          {rs.slice(0, 5).map((r) => (
            <div key={r.id}>
              <div className="aspect-square overflow-hidden rounded-lg">
                <Img r={r} empty="bg-[#DDE8E6]" />
              </div>
              <p className={`mt-1.5 text-xs font-medium ${title}`}>{r.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "Rolling pin · Nunito Sans",
    about: "Even grid · warm white, charcoal + mustard · photo with a solid title band under it",
    font: nunito.className,
    frame: "bg-[#FAFAF7] text-[#2E2A26]",
    header: "border-b border-black/10",
    logo: <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4A017] text-[#2E2A26]">{glyph.pin}</span>,
    add: (
      <span className="flex h-9 items-center gap-1.5 rounded-lg bg-[#2E2A26] px-3 text-sm font-bold text-white">
        <PlusGlyph /> New recipe
      </span>
    ),
    avatar: "rounded-lg bg-[#F1E7CC] text-[#2E2A26]",
    body: (rs) => (
      <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
            <div className="aspect-[4/3]">
              <Img r={r} empty="bg-[#F1E7CC]" />
            </div>
            <p className={`min-h-[4rem] p-3 font-bold ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Mortar & pestle · Lexend",
    about: "Mixed sizes (masonry, dense) · white + herb green · uneven heights, title on the photo",
    font: lexend.className,
    frame: "bg-white text-[#111]",
    header: "border-b border-black/5",
    logo: <span className="text-[#2F6B3F]">{glyph.mortar}</span>,
    add: (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2F6B3F] text-white">
        <PlusGlyph />
      </span>
    ),
    avatar: "rounded-lg bg-[#EAF2EC] text-[#2F6B3F]",
    body: (rs) => (
      <div className="columns-2 gap-2 p-3 sm:columns-4">
        {rs.slice(0, 8).map((r, i) => (
          <div key={r.id} className={`relative mb-2 break-inside-avoid overflow-hidden rounded-lg ${["aspect-[3/4]", "aspect-square", "aspect-[2/3]", "aspect-[4/5]"][i % 4]}`}>
            <Img r={r} empty="bg-[#EAF2EC]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent" />
            <p className={`absolute inset-x-0 bottom-0 p-2.5 text-sm font-medium text-white ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
];

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
  const sample = [...withImages.slice(0, 5), ...(noImage ? [noImage] : []), ...withImages.slice(5, 8)];

  return (
    <div className="space-y-14 py-4">
      <div>
        <h1 className="text-3xl font-semibold">Round 3</h1>
        <p className="mt-1 text-sm text-stone-500">
          App fonts, kitchen logos, squared buttons. Versions 2, 3, 5, 7, 8 and 10 mix card sizes; the rest keep an even grid.
        </p>
      </div>
      {versions.map((v, n) => (
        <section key={v.name}>
          <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-semibold">
              {n + 1}. {v.name}
            </span>
            <span className="text-sm text-stone-500">{v.about}</span>
          </h2>
          <div className={`overflow-hidden rounded-2xl ring-1 ring-black/10 ${v.frame} ${v.font}`}>
            <div className={`flex items-center justify-between px-5 py-3 ${v.header}`}>
              {v.logo}
              <div className="flex items-center gap-2">
                {v.add}
                <span className={`flex h-9 w-9 items-center justify-center text-sm font-semibold ${v.avatar}`}>B</span>
              </div>
            </div>
            {v.body(sample)}
          </div>
        </section>
      ))}
    </div>
  );
}
