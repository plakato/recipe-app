// Temporary: ten complete design directions side by side (font, icon-only
// logo, palette, recipe card), rendered with real recipes, to pick from.
import {
  Bricolage_Grotesque,
  DM_Sans,
  Instrument_Sans,
  Instrument_Serif,
  Inter_Tight,
  Manrope,
  Onest,
  Plus_Jakarta_Sans,
  Sora,
  Space_Grotesk,
  Syne,
} from "next/font/google";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"] });
const interTight = Inter_Tight({ subsets: ["latin", "latin-ext"] });
const dmSans = DM_Sans({ subsets: ["latin", "latin-ext"] });
const manrope = Manrope({ subsets: ["latin", "latin-ext"] });
const sora = Sora({ subsets: ["latin", "latin-ext"] });
const syne = Syne({ subsets: ["latin", "latin-ext"] });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"] });
const instrumentSans = Instrument_Sans({ subsets: ["latin", "latin-ext"] });
const instrumentSerif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"] });
const onest = Onest({ subsets: ["latin", "latin-ext"] });

type R = { id: string; title: string; imagePath: string | null; sourceType: string };

const sourceLabel = (r: R) =>
  r.sourceType === "photo" ? "From a photo" : r.sourceType === "url" ? "From the web" : "Handwritten";

// Image or a flat placeholder in the version's own muted colour.
function Img({ r, className = "", empty }: { r: R; className?: string; empty: string }) {
  return r.imagePath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={r.imagePath} alt="" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`h-full w-full ${empty}`} />
  );
}

// ---------- Logos (icon only) ----------
const Logo = {
  lime: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <circle cx="20" cy="20" r="17" fill="#C6F432" stroke="#121212" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="#121212" strokeWidth="1.5" />
      {[0, 60, 120].map((a) => (
        <line key={a} x1="20" y1="9" x2="20" y2="31" stroke="#121212" strokeWidth="1.5" transform={`rotate(${a} 20 20)`} />
      ))}
    </svg>
  ),
  tomato: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <circle cx="20" cy="23" r="15" fill="#FF4B2B" />
      <path d="M20 9c-3-4-8-3-9 0 3 1 6 1 9 0Zm0 0c3-4 8-3 9 0-3 1-6 1-9 0Z" fill="#2BAE66" />
      <path d="M20 9V4" stroke="#2BAE66" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  stack: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <rect x="6" y="27" width="28" height="7" rx="3.5" fill="#2F54EB" />
      <rect x="8" y="19" width="24" height="7" rx="3.5" fill="#2F54EB" opacity=".8" />
      <rect x="10" y="11" width="20" height="7" rx="3.5" fill="#2F54EB" opacity=".6" />
      <rect x="16" y="6" width="8" height="5" rx="1" fill="#FFD84D" />
    </svg>
  ),
  leaf: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <path d="M8 32C8 16 18 7 33 7c0 15-9 25-25 25Z" fill="#7CE0B4" />
      <path d="M8 32 25 15" stroke="#0E1411" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  fork: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <rect width="40" height="40" rx="12" fill="#FFD84D" />
      <path d="M14 8v9a6 6 0 0 0 12 0V8M20 8v24" stroke="#5B2A86" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <rect x="1.5" y="1.5" width="37" height="37" fill="#FFE600" stroke="#000" strokeWidth="3" />
      <path d="M20 7v26M7 20h26M10.8 10.8l18.4 18.4M29.2 10.8 10.8 29.2" stroke="#000" strokeWidth="4.5" strokeLinecap="square" />
    </svg>
  ),
  pot: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <rect x="7" y="16" width="26" height="17" rx="5" fill="#0F766E" />
      <rect x="4" y="18" width="4" height="4" rx="2" fill="#0F766E" />
      <rect x="32" y="18" width="4" height="4" rx="2" fill="#0F766E" />
      <rect x="9" y="11" width="22" height="4" rx="2" fill="#E9C46A" />
      <circle cx="20" cy="8.5" r="2.5" fill="#E9C46A" />
    </svg>
  ),
  monogram: () => (
    <svg viewBox="0 0 40 40" className="h-10 w-10">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="#1F4D3A" strokeWidth="1.2" />
      <text x="20" y="28" textAnchor="middle" fontSize="24" fill="#1F4D3A" style={{ fontFamily: instrumentSerif.style.fontFamily, fontStyle: "italic" }}>
        R
      </text>
    </svg>
  ),
  flame: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <path d="M20 4c2 7 11 11 11 21a11 11 0 0 1-22 0c0-6 4-9 5-14 2 4 4 5 6 5-2-4-1-8 0-12Z" fill="#FFB400" />
      <path d="M20 21c1 3 5 5 5 9a5 5 0 0 1-10 0c0-3 3-5 5-9Z" fill="#0F1330" />
    </svg>
  ),
  egg: () => (
    <svg viewBox="0 0 40 40" className="h-9 w-9">
      <defs>
        <linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00C2A8" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path d="M21 4c7 0 9 6 13 9s4 11-1 15-7 9-15 8-13-6-13-13 3-9 6-12 4-7 10-7Z" fill="url(#aurora)" />
      <circle cx="19" cy="20" r="6.5" fill="#fff" />
    </svg>
  ),
};

// ---------- Versions ----------
type Version = {
  name: string;
  about: string;
  font: string;
  frame: string; // background + text colour
  header: string; // border colour etc.
  logo: () => React.ReactElement;
  plus: string;
  avatar: string;
  grid: string;
  card: (r: R, i: number) => React.ReactElement;
};

const versions: Version[] = [
  {
    name: "Citrus",
    about: "Space Grotesk · lime on warm stone · title and label below the photo",
    font: spaceGrotesk.className,
    frame: "bg-[#F4F4EF] text-[#121212]",
    header: "border-b border-black/10",
    logo: Logo.lime,
    plus: "bg-[#121212] text-[#C6F432]",
    avatar: "border-2 border-[#121212] text-[#121212]",
    grid: "grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6",
    card: (r) => (
      <div className="group">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl">
          <Img r={r} empty="bg-[#E3E6D6]" className="transition duration-500 group-hover:scale-105" />
        </div>
        <p className="mt-2.5 text-[11px] font-medium uppercase tracking-widest text-black/45">{sourceLabel(r)}</p>
        <p className="mt-0.5 line-clamp-2 font-medium leading-snug">{r.title}</p>
      </div>
    ),
  },
  {
    name: "Tomato Press",
    about: "Inter Tight · tomato red on white · square photos, flat red title sticker",
    font: interTight.className,
    frame: "bg-white text-[#1A1A1A]",
    header: "border-b border-black/10",
    logo: Logo.tomato,
    plus: "bg-[#FF4B2B] text-white",
    avatar: "bg-[#1A1A1A] text-white",
    grid: "grid-cols-2 sm:grid-cols-3 gap-1",
    card: (r) => (
      <div className="relative aspect-square overflow-hidden">
        <Img r={r} empty="bg-[#FFE3DC]" />
        <span className="absolute bottom-2 left-2 right-8 w-fit bg-[#FF4B2B] px-2 py-1 text-sm font-semibold leading-tight text-white">
          <span className="line-clamp-2">{r.title}</span>
        </span>
      </div>
    ),
  },
  {
    name: "Cobalt",
    about: "DM Sans · cobalt blue + butter · soft rounded photos, numbered, bold title below",
    font: dmSans.className,
    frame: "bg-[#F5F7FF] text-[#0B1026]",
    header: "",
    logo: Logo.stack,
    plus: "bg-[#2F54EB] text-white",
    avatar: "bg-[#FFD84D] text-[#0B1026]",
    grid: "grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-7",
    card: (r, i) => (
      <div className="group">
        <div className="aspect-[5/4] overflow-hidden rounded-[1.75rem]">
          <Img r={r} empty="bg-[#DCE3FF]" className="transition duration-500 group-hover:scale-105" />
        </div>
        <div className="mt-3 flex gap-3">
          <span className="font-mono text-xs font-medium text-[#2F54EB]">{String(i + 1).padStart(2, "0")}</span>
          <p className="line-clamp-2 font-bold leading-snug">{r.title}</p>
        </div>
      </div>
    ),
  },
  {
    name: "Night Garden",
    about: "Manrope · dark by default, mint accent · title on the photo over a dark fade",
    font: manrope.className,
    frame: "bg-[#0E1411] text-[#EAF2EC]",
    header: "border-b border-white/10",
    logo: Logo.leaf,
    plus: "bg-[#7CE0B4] text-[#0E1411]",
    avatar: "bg-white/10 text-[#EAF2EC]",
    grid: "grid-cols-2 sm:grid-cols-3 gap-3",
    card: (r) => (
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
        <Img r={r} empty="bg-[#1C2A23]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0E1411] via-[#0E1411]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7CE0B4]">{sourceLabel(r)}</p>
          <p className="mt-1 line-clamp-2 font-semibold leading-snug">{r.title}</p>
        </div>
      </div>
    ),
  },
  {
    name: "Butter & Plum",
    about: "Sora · deep plum + butter yellow · print style: photo inside a white frame, title under it",
    font: sora.className,
    frame: "bg-[#FBF6E9] text-[#2A1B3D]",
    header: "",
    logo: Logo.fork,
    plus: "bg-[#5B2A86] text-[#FFD84D]",
    avatar: "bg-[#FFD84D] text-[#5B2A86]",
    grid: "grid-cols-2 sm:grid-cols-3 gap-4",
    card: (r, i) => (
      <div className={`bg-white p-2 pb-3 transition hover:rotate-0 ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
        <div className="aspect-square overflow-hidden">
          <Img r={r} empty="bg-[#EDE4F5]" />
        </div>
        <p className="mt-2.5 line-clamp-2 px-1 text-sm font-semibold leading-snug text-[#5B2A86]">{r.title}</p>
      </div>
    ),
  },
  {
    name: "Neo-brutal",
    about: "Syne · black, white, signal yellow · thick outlines and hard offset shadows",
    font: syne.className,
    frame: "bg-white text-black",
    header: "border-b-[3px] border-black",
    logo: Logo.star,
    plus: "bg-[#FFE600] text-black border-[3px] border-black rounded-none",
    avatar: "border-[3px] border-black rounded-none",
    grid: "grid-cols-2 sm:grid-cols-3 gap-4",
    card: (r) => (
      <div className="border-[3px] border-black bg-white shadow-[5px_5px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#000]">
        <div className="aspect-square overflow-hidden border-b-[3px] border-black">
          <Img r={r} empty="bg-[#FFE600]" />
        </div>
        <p className="line-clamp-2 p-2.5 text-sm font-bold uppercase leading-tight">{r.title}</p>
      </div>
    ),
  },
  {
    name: "Teal Journal",
    about: "Plus Jakarta Sans · deep teal + mustard · compact rows: small photo left, text right",
    font: jakarta.className,
    frame: "bg-[#F3F7F6] text-[#0F2A28]",
    header: "border-b border-[#0F766E]/15",
    logo: Logo.pot,
    plus: "bg-[#0F766E] text-white",
    avatar: "bg-[#E9C46A] text-[#0F2A28]",
    grid: "grid-cols-1 sm:grid-cols-2 gap-3",
    card: (r) => (
      <div className="flex items-center gap-4 rounded-2xl bg-white p-2.5 pr-4">
        <div className="h-20 w-20 flex-none overflow-hidden rounded-xl">
          <Img r={r} empty="bg-[#D5E8E4]" />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-snug">{r.title}</p>
          <p className="mt-1 text-xs text-[#0F766E]">{sourceLabel(r)}</p>
        </div>
      </div>
    ),
  },
  {
    name: "Editorial",
    about: "Instrument Serif + Instrument Sans · forest green on paper · tall photos, big serif title below",
    font: instrumentSans.className,
    frame: "bg-[#FAF9F6] text-[#111]",
    header: "border-b border-black/10",
    logo: Logo.monogram,
    plus: "bg-[#1F4D3A] text-white",
    avatar: "border border-[#1F4D3A] text-[#1F4D3A]",
    grid: "grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-8",
    card: (r) => (
      <div>
        <div className="aspect-[3/4] overflow-hidden">
          <Img r={r} empty="bg-[#E4EAE3]" />
        </div>
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#1F4D3A]">{sourceLabel(r)}</p>
        <p className="mt-1 line-clamp-2 text-xl leading-tight" style={{ fontFamily: instrumentSerif.style.fontFamily }}>
          {r.title}
        </p>
      </div>
    ),
  },
  {
    name: "Saffron Night",
    about: "Bricolage Grotesque · navy + saffron · rounded photos, chunky title and arrow below",
    font: bricolage.className,
    frame: "bg-[#0F1330] text-[#F4F1E8]",
    header: "border-b border-white/10",
    logo: Logo.flame,
    plus: "bg-[#FFB400] text-[#0F1330]",
    avatar: "bg-white/10 text-[#F4F1E8]",
    grid: "grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6",
    card: (r) => (
      <div className="group">
        <div className="aspect-square overflow-hidden rounded-3xl ring-2 ring-transparent transition group-hover:ring-[#FFB400]">
          <Img r={r} empty="bg-[#1D2350]" />
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-lg font-bold leading-tight tracking-tight">{r.title}</p>
          <span className="text-[#FFB400] transition group-hover:translate-x-1">→</span>
        </div>
      </div>
    ),
  },
  {
    name: "Aurora",
    about: "Onest · white with a teal-to-blue gradient · title on a blurred copy of the photo itself",
    font: onest.className,
    frame: "bg-white text-[#0A0A0A]",
    header: "border-b border-black/5",
    logo: Logo.egg,
    plus: "bg-gradient-to-br from-[#00C2A8] to-[#3B82F6] text-white",
    avatar: "bg-[#F1F5F9] text-[#0A0A0A]",
    grid: "grid-cols-2 sm:grid-cols-3 gap-3",
    card: (r) => (
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
        <Img r={r} empty="bg-gradient-to-br from-[#CFF5EF] to-[#DBE7FE]" />
        {r.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imagePath}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
            style={{ maskImage: "linear-gradient(to top, black 30%, transparent 55%)" }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
        <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-3 font-semibold leading-snug text-white">{r.title}</p>
      </div>
    ),
  },
];

const PlusGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default async function DesignLab() {
  const userId = await requireUserId();
  const all = await prisma.recipe.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, imagePath: true, sourceType: true },
  });
  // Six recipes with different photos, plus one without a photo if there is one.
  const seen = new Set<string>();
  const withImages = all.filter((r) => r.imagePath && !seen.has(r.imagePath) && seen.add(r.imagePath));
  const noImage = all.find((r) => !r.imagePath);
  const sample = [...withImages.slice(0, noImage ? 5 : 6), ...(noImage ? [noImage] : [])];

  return (
    <div className="space-y-14 py-4">
      <div>
        <h1 className="text-3xl font-semibold">10 directions</h1>
        <p className="mt-1 text-sm text-stone-500">
          Each is a mini version of the home screen: font, logo, colours and recipe card. Tell me what works in which.
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
            <div className={`flex items-center justify-between px-4 py-3 ${v.header}`}>
              <v.logo />
              <div className="flex items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${v.plus}`}>
                  <PlusGlyph />
                </span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${v.avatar}`}>
                  B
                </span>
              </div>
            </div>
            <div className={`grid p-4 ${v.grid}`}>
              {sample.map((r, i) => (
                <div key={r.id}>{v.card(r, i)}</div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
