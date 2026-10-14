import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ochrana súkromia" };

// Short privacy note, public (proxy.ts). Also the privacy-policy link of the
// Google project that lets the server back up to Google Drive.
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-stone-800 dark:text-stone-200">
      <h1 className="font-display text-3xl">Ochrana súkromia</h1>
      <p>
        Rodinné recepty sú súkromná aplikácia pre rodinu a známych. Ukladáme len to, čo do nej sami
        vložíte: e-mail a heslo (zašifrované) na prihlásenie, vaše recepty a fotky.
      </p>
      <p>
        Fotky a texty receptov posielame na prečítanie službám umelej inteligencie (cez OpenRouter)
        a na nakreslenie obrázka jedla (Cloudflare). Nič nepredávame ani nezdieľame s nikým ďalším.
      </p>
      <p>
        Ak si aplikáciu pripojíte v ChatGPT, ChatGPT smie po vašom súhlase čítať vaše recepty, aby vám
        poradil, čo uvariť. Nemôže ich meniť ani mazať. Pripojenie môžete kedykoľvek zrušiť v nastaveniach
        ChatGPT. Čo s textami robí ChatGPT, upravujú podmienky OpenAI.
      </p>
      <p>
        Zálohy databázy a fotiek sa každú noc ukladajú na Google Disk prevádzkovateľa. Aplikácia
        nemá prístup k vášmu Google účtu.
      </p>
      <p>
        Na požiadanie váš účet aj s receptmi a fotkami zmažeme. Recepty môžete kedykoľvek zmazať
        aj sami.
      </p>
    </article>
  );
}
