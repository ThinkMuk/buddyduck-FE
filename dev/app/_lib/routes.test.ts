import { describe, expect, it } from "vitest";
import {
  SCREEN_ROUTES,
  getScreenById,
  resolveScreenFromSlug,
  safeInternalPath,
} from "./routes";

describe("screen route registry", () => {
  it("exposes every requested BuddyDuck screen exactly once", () => {
    expect(SCREEN_ROUTES.map((screen) => screen.id)).toEqual([
      "CB-01",
      "CB-02",
      "CB-03",
      "CB-04",
      "CB-04prime",
      "CB-05",
      "CB-06",
      "CB-07A",
      "CB-07B",
      "CB-07C",
      "CB-07D",
      "CB-07Dprime",
      "CB-08",
      "CB-09",
      "CB-10",
      "CB-11",
      "CB-11prime",
      "CB-12",
      "CB-13",
      "CB-14",
      "CB-14prime"
    ]);
  });

  it("maps canonical slugs and modal query states to screens", () => {
    expect(resolveScreenFromSlug([], {})?.id).toBe("CB-01");
    expect(resolveScreenFromSlug(["unknown"], {})).toBeUndefined();
    expect(resolveScreenFromSlug(["rooms"], {})?.id).toBe("CB-04");
    expect(resolveScreenFromSlug(["rooms"], { modal: "tags" })?.id).toBe("CB-04prime");
    expect(resolveScreenFromSlug(["rooms", "host"], { modal: "open-chat" })?.id).toBe("CB-08");
    expect(resolveScreenFromSlug(["rooms", "member"], { modal: "open-chat" })?.id).toBe("CB-08");
    expect(resolveScreenFromSlug(["rooms", "visitor"], { modal: "apply" })?.id).toBe("CB-07Dprime");
    expect(resolveScreenFromSlug(["rooms", "r1"], {})?.id).toBe("CB-07A");
    expect(resolveScreenFromSlug(["rooms", "r2"], { modal: "open-chat" })?.id).toBe("CB-08");
    expect(resolveScreenFromSlug(["rooms", "r3"], { modal: "open-chat" })?.id).toBe("CB-07C");
    expect(resolveScreenFromSlug(["rooms", "r4"], { modal: "apply" })?.id).toBe("CB-07Dprime");
    expect(resolveScreenFromSlug(["timetable"], { modal: "warning" })?.id).toBe("CB-11prime");
    expect(resolveScreenFromSlug(["profile", "edit"], {})?.id).toBe("CB-14prime");
    expect(getScreenById("CB-12").href).toBe("/map");
  });
});

describe("safeInternalPath", () => {
  it("accepts in-app absolute paths and uses the first array entry", () => {
    expect(safeInternalPath("/rooms?concertId=1")).toBe("/rooms?concertId=1");
    expect(safeInternalPath("/my-rooms")).toBe("/my-rooms");
    expect(safeInternalPath(["/rooms?concertId=2", "/ignored"])).toBe(
      "/rooms?concertId=2",
    );
  });

  it("rejects external, protocol-relative, smuggled, and empty values", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("/\\evil.com")).toBeNull();
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("rooms")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});
