import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { handlers } from "./handlers";

const server = setupServer(...handlers);

describe("MSW handlers", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("handles apply and profile update endpoints", async () => {
    const applied = await fetch("http://localhost/api/rooms/r4/apply", {
      method: "POST",
    });
    const profile = await fetch("http://localhost/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ nickname: "new_duck" }),
    });

    expect(applied.status).toBe(200);
    expect(profile.status).toBe(200);
    await expect(profile.json()).resolves.toMatchObject({
      nickname: "new_duck",
    });
  });
});
