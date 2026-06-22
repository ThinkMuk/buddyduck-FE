import { http, HttpResponse } from "msw";
import { myProfile } from "@/lib/data";

export const handlers = [
  http.post("*/api/rooms/:id/apply", ({ params }) =>
    HttpResponse.json({
      ok: true,
      roomId: params.id,
      status: "pending",
    }),
  ),
  http.get("*/api/profile", () => HttpResponse.json(myProfile)),
  http.patch("*/api/profile", async ({ request }) => {
    const body = (await request.json()) as Partial<typeof myProfile>;

    return HttpResponse.json({
      ...myProfile,
      ...body,
    });
  }),
  // NOTE: PATCH /api/users/me/profile (PROFILE-002, CB-02 프로필 완료) is intentionally
  // NOT mocked. It is connected to the real backend via src/lib/auth/profile.ts. A mock
  // here would shadow the real call in dev/e2e and fake profileCompleted=true without
  // persisting it, leaving the backend at profileCompleted=false — so any protected API
  // (e.g. GET /api/concerts/{id}/rooms) keeps returning 403 AUTH_REQUIRED_PROFILE_INFO
  // and bounces the user back to /nickname in an infinite loop. The profile-completion
  // call must always hit NEXT_PUBLIC_API_BASE_URL.
];
