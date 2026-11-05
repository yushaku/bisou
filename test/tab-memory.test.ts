import { describe, expect, it } from "vitest";
import { createTabMemory } from "../src/client/lib/tabMemory";

describe("tab memory", () => {
  it("keeps independent positions and loaded journal pages within one session", () => {
    const memory = createTabMemory();
    memory.scroll.set("home", 120);
    memory.scroll.set("journal", 2400);
    memory.journal = { entries: [], nextCursor: "older-page" };
    memory.scroll.set("home", 0);
    expect(memory.scroll.get("journal")).toBe(2400);
    expect(memory.journal.nextCursor).toBe("older-page");
  });

  it("starts a new session without another session's positions or feed", () => {
    const old = createTabMemory();
    old.scroll.set("journal", 2400);
    old.journal = { entries: [], nextCursor: "older-page" };
    const fresh = createTabMemory();
    expect(fresh.scroll.size).toBe(0);
    expect(fresh.journal).toBeNull();
  });
});
