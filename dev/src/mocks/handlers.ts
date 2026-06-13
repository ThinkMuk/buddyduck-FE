import { http, HttpResponse } from "msw";
import { concerts, myProfile, rooms } from "@/lib/data";

export const handlers = [
  http.get("*/api/concerts", () => HttpResponse.json(concerts)),
  http.get("*/api/rooms", ({ request }) => {
    const tag = new URL(request.url).searchParams.get("tag");
    const filteredRooms = tag ? rooms.filter((room) => room.tags.includes(tag)) : rooms;

    return HttpResponse.json(filteredRooms);
  }),
  http.post("*/api/rooms", async ({ request }) => {
    const body = (await request.json()) as { title?: string; tags?: string[] };

    return HttpResponse.json(
      {
        ...rooms[0],
        id: `draft-${Date.now()}`,
        title: body.title ?? rooms[0].title,
        tags: body.tags ?? rooms[0].tags
      },
      { status: 201 }
    );
  }),
  http.post("*/api/rooms/:id/apply", ({ params }) =>
    HttpResponse.json({
      ok: true,
      roomId: params.id,
      status: "pending"
    })
  ),
  http.get("*/api/profile", () => HttpResponse.json(myProfile)),
  http.patch("*/api/profile", async ({ request }) => {
    const body = (await request.json()) as Partial<typeof myProfile>;

    return HttpResponse.json({
      ...myProfile,
      ...body
    });
  })
];
