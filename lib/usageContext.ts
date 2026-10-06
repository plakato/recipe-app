// Who an AI call is made for and why, without threading it through every
// function: actions wrap their work in withUsage(), and the model client
// (lib/extractRecipe.ts) reads it when recording each call. Server-only.
import { AsyncLocalStorage } from "node:async_hooks";

export type UsageContext = {
  userId?: string;
  isGuest?: boolean;
  purpose?: "read-recipe" | "choose-photos";
};

const store = new AsyncLocalStorage<UsageContext>();

// Run fn with this context added to the current one.
export function withUsage<T>(ctx: UsageContext, fn: () => Promise<T>): Promise<T> {
  return store.run({ ...store.getStore(), ...ctx }, fn);
}

// Set the context for the rest of the calling async function (e.g. a Server
// Action, once it knows who is asking).
export function enterUsage(ctx: UsageContext): void {
  store.enterWith({ ...store.getStore(), ...ctx });
}

export function currentUsage(): UsageContext {
  return store.getStore() ?? {};
}
