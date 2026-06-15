import type { Room } from "@/lib/data";

export function roomHref(room: Room) {
  return `/rooms/${room.id}`;
}
