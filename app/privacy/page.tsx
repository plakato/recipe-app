import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ochrana súkromia" };
// The operator's name and contact come from .env (PRIVACY_OPERATOR,
// PRIVACY_EMAIL), so no personal details sit in the public code.
export const dynamic = "force-dynamic";

const UPDATED = "19. 10. 2026";

// The privacy policy, public (proxy.ts). Also the privacy-policy and
// data-deletion link for Google and Facebook sign-in and the Google project
// behind the backups. Keep it true to what the app does: lib/housekeeping.ts
// (IP addresses, guests), scripts/backup.sh (backup retention), lib/auth.ts
// (sessions).
export default function PrivacyPage() {
  const operator = process.env.PRIVACY_OPERATOR;
  const email = process.env.PRIVACY_EMAIL;
  const contact = email ? (
    <a href={`mailto:${email}`} className="text-olive-700 underline dark:text-olive-400">
      {email}
    </a>
  ) : (
    "e-mail prevádzkovateľa"
  );
  const h2 = "font-display pt-2 text-xl";
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-stone-800 dark:text-stone-200">
      <h1 className="font-display text-3xl">Ochrana súkromia</h1>
      <p className="text-sm text-stone-500">Platné od {UPDATED}</p>
      <p>
        Receptík je malá súkromná aplikácia na recepty pre rodinu a známych. Ukladáme len to, čo je na jej
        fungovanie potrebné, nič nepredávame a nezobrazujeme reklamy.
      </p>

      <h2 className={h2}>Kto za údaje zodpovedá</h2>
      <p>
        Prevádzkovateľ: {operator ?? "prevádzkovateľ aplikácie"}. Kontakt pre všetky otázky aj žiadosti o
        zmazanie: {contact}.
      </p>

      <h2 className={h2}>Aké údaje ukladáme</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Účet:</strong> e-mail, meno (ak ho zadáte) a heslo — to len ako zašifrovaný odtlačok, z
          ktorého sa heslo nedá zistiť.
        </li>
        <li>
          <strong>Prihlásenie cez Google alebo Facebook:</strong> od nich dostaneme iba váš e-mail, meno a
          číslo vášho účtu u nich. Nedostaneme heslo, priateľov, kontakty ani príspevky a nič za vás
          nezverejňujeme.
        </li>
        <li>
          <strong>Recepty a fotky,</strong> ktoré do aplikácie vložíte.
        </li>
        <li>
          <strong>Technické údaje:</strong> prihlasovacie cookie (nevyhnutné, aby ste zostali prihlásení;
          žiadne reklamné ani analytické cookies), IP adresa pri registrácii, vyskúšaní dema a čítaní
          receptu z fotky (na ochranu pred zneužitím) a záznamy o používaní, napr. koľko receptov sa
          pridalo (na denné limity a štatistiky).
        </li>
      </ul>

      <h2 className={h2}>Na čo ich používame</h2>
      <p>
        Na prevádzku vášho účtu a receptov, na prečítanie receptu z fotky alebo z textu pomocou umelej
        inteligencie, na ochranu pred zneužitím a na zálohy. Právnym základom je poskytovanie služby, o
        ktorú ste požiadali, a náš oprávnený záujem na bezpečnosti a zálohách; pripojenie ChatGPT je na
        základe vášho súhlasu, ktorý môžete kedykoľvek odvolať.
      </p>

      <h2 className={h2}>Komu ich posielame</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Hetzner</strong> (Nemecko) — server, na ktorom aplikácia beží.
        </li>
        <li>
          <strong>OpenRouter</strong> (USA) a ním zvolení poskytovatelia modelov umelej inteligencie (napr.
          Google) — fotky a texty receptov, ktoré chcete načítať.
        </li>
        <li>
          <strong>Cloudflare</strong> (USA) — sieťové pripojenie stránky, automatická kontrola proti robotom
          pri registrácii a nakreslenie obrázka jedla (posiela sa len popis jedla).
        </li>
        <li>
          <strong>Google Disk prevádzkovateľa</strong> — nočné zálohy databázy a fotiek, zašifrované ešte na
          našom serveri, takže Google ich nevie prečítať.
        </li>
        <li>
          <strong>Google alebo Facebook</strong> — len ak sa cez ne prihlasujete (overia, že ste to vy).
        </li>
        <li>
          <strong>OpenAI (ChatGPT)</strong> — len ak si Receptík v ChatGPT sami pripojíte: potom smie čítať
          vaše recepty, aby vám poradil, čo uvariť; meniť ani mazať ich nemôže. Ako s textami zaobchádza
          ChatGPT, upravujú podmienky OpenAI.
        </li>
      </ul>
      <p>
        Pri službách v USA sa údaje prenášajú mimo EÚ na základe záruk, ktoré tieto služby poskytujú (napr.
        štandardné zmluvné doložky EÚ alebo rámec EU-US Data Privacy Framework).
      </p>

      <h2 className={h2}>Ako dlho ich uchovávame</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Účet, recepty a fotky — kým účet máte. Recept v koši môžete obnoviť, kým ho natrvalo nezmažete.</li>
        <li>IP adresy — najviac 7 dní.</li>
        <li>Prihlásenie v prehliadači — 30 dní; účty z dema bez registrácie sa mažú po 24 hodinách nečinnosti.</li>
        <li>
          Zálohy databázy — 90 dní. Zálohy fotiek sa samy nemažú; keď požiadate o zmazanie účtu, vymažeme
          vaše fotky aj zo záloh.
        </li>
      </ul>

      <h2 className={h2}>Zmazanie údajov</h2>
      <p>
        Jednotlivé recepty môžete kedykoľvek zmazať sami. Ak chcete zmazať celý účet so všetkými receptmi a
        fotkami, napíšte na {contact} z e-mailu, ktorým sa prihlasujete (aj ak sa prihlasujete cez Google
        alebo Facebook). Zmažeme ho do 30 dní a dáme vám vedieť.
      </p>
      <p>
        Prístup aplikácie k vášmu účtu Google zrušíte na{" "}
        <a href="https://myaccount.google.com/permissions" className="text-olive-700 underline dark:text-olive-400">
          myaccount.google.com/permissions
        </a>
        , k Facebooku v jeho nastaveniach v časti „Aplikácie a weby“ a ChatGPT v nastaveniach ChatGPT
        medzi pluginmi.
      </p>

      <h2 className={h2}>Vaše práva</h2>
      <p>
        Máte právo vedieť, aké údaje o vás máme, dať ich opraviť alebo vymazať, dostať ich v strojovo
        čitateľnej podobe, namietať proti ich spracúvaniu a odvolať súhlas. Stačí napísať na {contact}. Ak
        si myslíte, že s vašimi údajmi zaobchádzame nesprávne, môžete sa obrátiť aj na{" "}
        <a href="https://dataprotection.gov.sk" className="text-olive-700 underline dark:text-olive-400">
          Úrad na ochranu osobných údajov SR
        </a>
        .
      </p>

      <h2 className={h2}>Ostatné</h2>
      <p>
        Aplikácia nie je určená deťom do 16 rokov. Ak tieto zásady zmeníme, upravíme dátum hore na tejto
        stránke.
      </p>
    </article>
  );
}
