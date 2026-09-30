import SaltLogo, { variants, type SaltVariant } from "@/components/SaltLogo";

// Temporary: side-by-side preview of the salt sprinkle styles, to pick one.
export default function LogoLab() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <h1 className="font-display mb-2 text-3xl">Salt sprinkles</h1>
      <p className="mb-8 text-sm text-stone-500">Hover a row to see the grains drift. Pick a number.</p>
      <ol className="divide-y divide-stone-200 dark:divide-stone-800">
        {(Object.keys(variants) as SaltVariant[]).map((id, i) => (
          <li key={id} className="group grid grid-cols-[2rem_1fr] items-center gap-x-4 gap-y-3 py-6 sm:grid-cols-[2rem_1fr_auto]">
            <span className="font-display text-2xl text-blush-500">{i + 1}</span>
            <div>
              <p className="font-medium">{variants[id].name}</p>
              <p className="text-sm text-stone-500">{variants[id].hint}</p>
            </div>
            <div className="col-start-2 flex items-end gap-8 sm:col-start-3">
              <span className="text-5xl"><SaltLogo variant={id} /></span>
              <span className="text-2xl"><SaltLogo variant={id} /></span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
