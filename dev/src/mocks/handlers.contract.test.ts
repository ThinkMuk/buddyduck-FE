import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { rooms } from "@/lib/data";
import { handlers } from "./handlers";

const server = setupServer(...handlers);

describe("MSW handlers", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("filters rooms by tag query", async () => {
    const response = await fetch("http://localhost/api/rooms?tag=차량%20공유");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((room: (typeof rooms)[number]) => room.tags.includes("차량 공유"))).toBe(true);
  });

  it("handles room creation, apply, and profile update endpoints", async () => {
    const created = await fetch("http://localhost/api/rooms", {
      method: "POST",
      body: JSON.stringify({ title: "새 동행방", tags: ["굿즈 줄서기"] })
    });
    const applied = await fetch("http://localhost/api/rooms/r4/apply", { method: "POST" });
    const profile = await fetch("http://localhost/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ nickname: "new_duck" })
    });

    expect(created.status).toBe(201);
    expect(applied.status).toBe(200);
    expect(profile.status).toBe(200);
    await expect(profile.json()).resolves.toMatchObject({ nickname: "new_duck" });
  });
});
