// What people see when something goes wrong: a kind, plain message instead
// of a provider error. Technical details go to the server log only.

export type ErrorCode =
  | "busy"
  | "no-recipe"
  | "limit-account"
  | "limit-visitor"
  | "limit-ip"
  | "limit-everyone"
  | "unknown";

export const USER_MESSAGES: Record<ErrorCode, string> = {
  busy:
    "Our recipe reader is very busy right now. Please try again in a few minutes — sorry about the wait!",
  "no-recipe":
    "We couldn't find a recipe here. Try a sharp, well-lit photo that shows the whole recipe.",
  "limit-account":
    "You've reached today's limit for adding recipes with AI. It resets within 24 hours — thanks for your patience!",
  "limit-visitor":
    "That's the limit for trying it without an account. Sign up for free to add more recipes.",
  "limit-ip":
    "Lots of recipes have been added from your network today. Please try again tomorrow — sorry!",
  "limit-everyone":
    "The recipe reader has reached its limit for today. Please try again tomorrow — sorry!",
  unknown: "Something went wrong while reading the recipe. Please try again — sorry about that!",
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
