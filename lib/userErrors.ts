// What people see when something goes wrong: a kind, plain message instead
// of a provider error. Technical details go to the server log only.

export type ErrorCode =
  | "busy"
  | "no-recipe"
  | "bad-photo"
  | "limit-account"
  | "limit-visitor"
  | "limit-ip"
  | "limit-everyone"
  | "limit-demo"
  | "unknown";

export const USER_MESSAGES: Record<ErrorCode, string> = {
  busy: "Čítačka receptov je práve veľmi vyťažená. Skúste to prosím o pár minút — ospravedlňujeme sa za čakanie!",
  "no-recipe": "Nenašli sme tu recept. Skúste ostrú, dobre osvetlenú fotku, na ktorej je celý recept.",
  "bad-photo": "Jednu z fotiek nevieme otvoriť: tento typ nepodporujeme alebo je príliš veľká (najviac 8 MB).",
  "limit-account":
    "Dosiahli ste dnešný limit pridávania receptov pomocou AI. Obnoví sa do 24 hodín — ďakujeme za trpezlivosť!",
  "limit-visitor":
    "To je limit na vyskúšanie bez účtu. Zaregistrujte sa zadarmo a môžete pridať ďalšie recepty.",
  "limit-ip": "Z vašej siete dnes pribudlo veľa receptov. Skúste to prosím zajtra — prepáčte!",
  "limit-everyone": "Čítačka receptov dnes dosiahla svoj limit. Skúste to prosím zajtra — prepáčte!",
  "limit-demo":
    "Ukážka je dnes veľmi obľúbená, takže teraz nemôžeme spustiť ďalšiu. Skúste to prosím zajtra — alebo sa zaregistrujte a založte si vlastnú kuchárku.",
  unknown: "Pri čítaní receptu sa niečo pokazilo. Skúste to prosím znova — prepáčte!",
};

// An error whose message is safe to show to the user.
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    // Technical detail for the server log (never shown).
    readonly detail?: string,
  ) {
    super(USER_MESSAGES[code]);
    this.name = "AppError";
  }
}

// The message to show for any error; unexpected ones are logged.
export function toUserMessage(err: unknown): string {
  if (err instanceof AppError) {
    if (err.detail) console.warn(`[${err.code}] ${err.detail}`);
    return err.message;
  }
  console.error(err);
  return USER_MESSAGES.unknown;
}
