import { describe, expect, it } from "vitest";
import { notice } from "./readingNotice";

const r = (id: string, title: string, like?: { id: string; title: string }) => (like ? { id, title, like } : { id, title });

describe("notice", () => {
  it("opens the recipe itself when one was read", () => {
    expect(notice({ id: "w1", state: "done", recipes: [r("a", "Kapustnica")] })).toEqual({
      title: "Recept je prečítaný",
      body: "Kapustnica",
      url: "/recipes/a",
    });
  });

  it("opens the reading's page for several recipes, in Slovak plural", () => {
    const two = notice({ id: "w1", state: "done", recipes: [r("a", "Kapustnica"), r("b", "Pórková")] });
    expect(two).toEqual({ title: "Prečítané: 2 recepty", body: "Kapustnica, Pórková", url: "/recipes/read/w1" });
    const five = notice({ id: "w1", state: "done", recipes: ["a", "b", "c", "d", "e"].map((id) => r(id, id)) });
    expect(five.title).toBe("Prečítané: 5 receptov");
  });

  it("says when a recipe looks like one they have, and opens the reading's page", () => {
    const n = notice({ id: "w1", state: "done", recipes: [r("a", "Kapustnica", { id: "old", title: "Kapustnica" })] });
    expect(n.body).toBe("Kapustnica — vyzerá ako recept, ktorý už máte.");
    expect(n.url).toBe("/recipes/read/w1");
  });

  it("tells a failure with its reason", () => {
    expect(notice({ id: "w1", state: "failed", error: "Busy.", canRetry: true })).toEqual({
      title: "Recept sa nepodarilo prečítať",
      body: "Busy.",
      url: "/recipes/read/w1",
    });
  });
});
