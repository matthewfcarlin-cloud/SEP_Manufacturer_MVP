import { describe, expect, it } from "vitest";
import { outline as deckOutline } from "./script";
import { advance, last, parsePosition, progress, retreat, start, toSearch } from "./timeline";

const outline = [1, 3, 2];

describe("deck timeline", () => {
  it("steps through beats, then slides", () => {
    expect(advance(start, outline)).toEqual({ slide: 1, beat: 0 });
    expect(advance({ slide: 1, beat: 0 }, outline)).toEqual({ slide: 1, beat: 1 });
    expect(advance({ slide: 1, beat: 2 }, outline)).toEqual({ slide: 2, beat: 0 });
  });

  it("stops at both ends", () => {
    expect(advance(last(outline), outline)).toEqual(last(outline));
    expect(retreat(start, outline)).toEqual(start);
  });

  it("steps back into the previous slide's last beat", () => {
    expect(retreat({ slide: 2, beat: 0 }, outline)).toEqual({ slide: 1, beat: 2 });
  });

  it("round-trips a position through the URL and clamps nonsense", () => {
    const at = { slide: 1, beat: 2 };
    const params = new URLSearchParams(toSearch(at));
    expect(parsePosition(params.get("slide") ?? undefined, params.get("beat") ?? undefined, outline)).toEqual(at);
    expect(parsePosition("99", "99", outline)).toEqual(last(outline));
    expect(parsePosition("abc", undefined, outline)).toEqual(start);
    expect(toSearch(start)).toBe("?slide=1");
  });

  it("reports progress from 0 to 1", () => {
    expect(progress(start, outline)).toBe(0);
    expect(progress(last(outline), outline)).toBe(1);
  });

  it("has no empty slides in the real deck", () => {
    expect(deckOutline.every((beats) => beats > 0)).toBe(true);
  });
});
