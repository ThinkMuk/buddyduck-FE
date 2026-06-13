import { describe, expect, it } from "vitest";
import { SCREEN_ROUTES, getScreenById, resolveScreenFromSlug } from "./routes";

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
    expect(resolveScreenFromSlug([], {}).id).toBe("CB-01");
    expect(resolveScreenFromSlug(["unknown"], {}).id).toBe("CB-01");
    expect(resolveScreenFromSlug(["rooms"], {}).id).toBe("CB-04");
    expect(resolveScreenFromSlug(["rooms"], { modal: "tags" }).id).toBe("CB-04prime");
    expect(resolveScreenFromSlug(["rooms", "member"], { modal: "open-chat" }).id).toBe("CB-08");
    expect(resolveScreenFromSlug(["rooms", "visitor"], { modal: "apply" }).id).toBe("CB-07Dprime");
    expect(resolveScreenFromSlug(["timetable"], { modal: "warning" }).id).toBe("CB-11prime");
    expect(resolveScreenFromSlug(["profile", "edit"], {}).id).toBe("CB-14prime");
    expect(getScreenById("CB-12").href).toBe("/map");
  });
});
