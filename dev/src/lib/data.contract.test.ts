import { describe, expect, it } from "vitest";
import { chatMessages, concerts, memories, members, myProfile, rooms, timetableStops } from "./data";

describe("BuddyDuck mock data contract", () => {
  it("keeps the screen inventory supplied with enough realistic records", () => {
    expect(concerts).toHaveLength(4);
    expect(rooms.length).toBeGreaterThanOrEqual(6);
    expect(memories.length).toBeGreaterThanOrEqual(6);
    expect(chatMessages.length).toBeGreaterThanOrEqual(3);
  });

  it("exposes the fields required by the goal prompt", () => {
    expect(concerts[0]).toMatchObject({
      id: expect.any(String),
      artist: expect.any(String),
      title: expect.any(String),
      date: expect.any(String),
      venue: expect.any(String),
      thumbnailUrl: expect.any(String),
      roomCount: expect.any(Number)
    });
    expect(rooms.map((room) => room.status)).toEqual(expect.arrayContaining(["host", "member", "pending", "visitor"]));
    expect(members.map((member) => member.role)).toEqual(expect.arrayContaining(["host", "member", "pending"]));
    expect(timetableStops.map((stop) => stop.mode)).toEqual(expect.arrayContaining(["walk", "transit", "drive"]));
    expect(myProfile).toMatchObject({
      id: expect.any(String),
      nickname: expect.any(String),
      bio: expect.any(String),
      avatar: expect.any(String),
      tags: expect.any(Array),
      concertCount: expect.any(Number),
      buddyCount: expect.any(Number)
    });
  });
});
