// Temporary: round 4 — Lucide icons for the logos and controls, app-style sans
// fonts, squared buttons; half the versions mix card sizes.
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
import {
  ArrowUpRight,
  CakeSlice,
  ChefHat,
  CookingPot,
  Croissant,
  EggFried,
  Plus,
  Salad,
  Soup,
  Utensils,
  UtensilsCrossed,
  Wheat,
} from "lucide-react";
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

// Lucide logo marks: a tile with the icon, or the icon on its own.
const tile = (Icon: typeof ChefHat, cls: string) => (
  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${cls}`}>
    <Icon className="h-6 w-6" strokeWidth={1.75} />
  </span>
);
const bare = (Icon: typeof ChefHat, cls: string) => <Icon className={`h-7 w-7 ${cls}`} strokeWidth={2} />;
const PlusGlyph = () => <Plus className="h-4 w-4" strokeWidth={2.25} />;

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
    name: "Chef's hat · Inter",
    about: "Even grid · bone + pine · tall photos, title below · labelled button",
    font: inter.className,
    frame: "bg-[#F6F4EE] text-[#171717]",
    header: "border-b border-black/10",
    logo: tile(ChefHat, "bg-[#1F4D3A] text-[#F6F4EE]"),
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
            <div className="mt-2.5 flex items-start justify-between gap-2">
              <p className={`text-[15px] font-semibold ${title}`}>{r.title}</p>
              <ArrowUpRight className="mt-0.5 h-4 w-4 flex-none text-[#1F4D3A]" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Cooking pot · Geist",
    about: "Mixed sizes (bento) · white + ink + olive · newest recipe takes a 2×2 tile",
    font: geist.className,
    frame: "bg-white text-[#111]",
    header: "border-b border-black/5",
    logo: bare(CookingPot, "text-[#111]"),
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
    name: "Soup · Figtree",
    about: "Mixed sizes (masonry) · warm paper + oxblood · uneven photo heights, title below",
    font: figtree.className,
    frame: "bg-[#F2EFE8] text-[#1A1A1A]",
    header: "border-b border-black/10",
    logo: tile(Soup, "bg-[#6B1F2A] text-[#F2EFE8]"),
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
    name: "Fried egg · Rubik",
    about: "Even grid · dark app with egg-yolk yellow · square photos, title on the photo",
    font: rubik.className,
    frame: "bg-[#121212] text-[#F2EFE8]",
    header: "border-b border-white/10",
    logo: tile(EggFried, "bg-[#E8C468] text-[#121212]"),
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
    name: "Crossed utensils · Outfit",
    about: "Mixed sizes (feature) · sand + forest green · newest recipe big, the rest in a grid",
    font: outfit.className,
    frame: "bg-[#EEE9DF] text-[#1B1B1B]",
    header: "border-b border-black/10",
    logo: bare(UtensilsCrossed, "text-[#243B2F]"),
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
    name: "Salad · Urbanist",
    about: "Even rows · white + herb green · compact app list: thumbnail left, title right, two columns",
    font: urbanist.className,
    frame: "bg-white text-[#16241A]",
    header: "border-b border-[#16241A]/10",
    logo: tile(Salad, "bg-[#2F6B3F] text-white"),
    add: (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2F6B3F] text-white">
        <PlusGlyph />
      </span>
    ),
    avatar: "rounded-lg bg-[#E7F0E8] text-[#2F6B3F]",
    body: (rs) => (
      <div className="grid grid-cols-1 gap-x-6 p-4 sm:grid-cols-2">
        {rs.slice(0, 6).map((r) => (
          <div key={r.id} className="flex items-center gap-4 border-b border-[#16241A]/10 py-3">
            <div className="h-16 w-16 flex-none overflow-hidden rounded-lg">
              <Img r={r} empty="bg-[#E7F0E8]" />
            </div>
            <p className={`font-bold ${title}`}>{r.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Croissant · Albert Sans",
    about: "Mixed sizes (rhythm) · cream + cocoa + butter · a row of two big, then a row of three small",
    font: albert.className,
    frame: "bg-[#FBF7EE] text-[#2A1F18]",
    header: "",
    logo: tile(Croissant, "bg-[#F3D98B] text-[#4A3426]"),
    add: (
      <span className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4A3426] px-3 text-sm font-medium text-white">
        <PlusGlyph /> New recipe
      </span>
    ),
    avatar: "rounded-lg bg-[#F3E6C8] text-[#4A3426]",
    body: (rs) => (
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-4">
          {rs.slice(0, 2).map((r) => (
            <div key={r.id}>
              <div className="aspect-[4/3] overflow-hidden rounded-xl">
                <Img r={r} empty="bg-[#F3E6C8]" />
              </div>
              <p className={`mt-2.5 text-lg font-semibold ${title}`}>{r.title}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {rs.slice(2, 5).map((r) => (
            <div key={r.id}>
              <div className="aspect-square overflow-hidden rounded-xl">
                <Img r={r} empty="bg-[#F3E6C8]" />
              </div>
              <p className={`mt-2 text-sm font-semibold ${title}`}>{r.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: "Fork & knife · Public Sans",
    about: "Mixed sizes (app shelves) · bone + deep teal · a swipeable row of big newest cards, then a grid",
    font: publicSans.className,
    frame: "bg-[#F6F4EE] text-[#132A2A]",
    header: "border-b border-black/10",
    logo: bare(Utensils, "text-[#0F4C4C]"),
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
    name: "Cake slice · Nunito Sans",
    about: "Even grid · warm white, charcoal + mustard · photo with a solid title band under it",
    font: nunito.className,
    frame: "bg-[#FAFAF7] text-[#2E2A26]",
    header: "border-b border-black/10",
    logo: tile(CakeSlice, "bg-[#D4A017] text-[#2E2A26]"),
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
    name: "Wheat · Lexend",
    about: "Mixed sizes (masonry, dense) · white + ink + wheat · uneven heights, title on the photo",
    font: lexend.className,
    frame: "bg-white text-[#111]",
    header: "border-b border-black/5",
    logo: bare(Wheat, "text-[#8A6A3B]"),
    add: (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1C1C1C] text-white">
        <PlusGlyph />
      </span>
    ),
    avatar: "rounded-lg bg-[#F1EADC] text-[#1C1C1C]",
    body: (rs) => (
      <div className="columns-2 gap-2 p-3 sm:columns-4">
        {rs.slice(0, 8).map((r, i) => (
          <div key={r.id} className={`relative mb-2 break-inside-avoid overflow-hidden rounded-lg ${["aspect-[3/4]", "aspect-square", "aspect-[2/3]", "aspect-[4/5]"][i % 4]}`}>
            <Img r={r} empty="bg-[#F1EADC]" />
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
        <h1 className="text-3xl font-semibold">Round 4 · Lucide</h1>
        <p className="mt-1 text-sm text-stone-500">
          Lucide icons for logos and controls. Versions 2, 3, 5, 7, 8 and 10 mix card sizes; the rest keep an even grid.
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
