// Feature switches.

// Adding recipes from a web link is paused while photo import is perfected.
// Recipes imported from links stay in the database untouched but are hidden
// everywhere in the app until this is switched back on.
export const URL_IMPORT_ENABLED = false;

// Prisma `where` filter for the recipes the app shows (spread it into queries).
export const visibleRecipes = URL_IMPORT_ENABLED ? {} : { sourceType: { not: "url" } };

// Photo import: how many photos may be read together (one recipe over a few
// pages, a page plus a picture of the dish).
export const MAX_PHOTOS = 5;
