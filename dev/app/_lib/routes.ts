import { rooms, type RoomStatus } from "@/lib/data";

export type ScreenId =
  | "CB-01"
  | "CB-02"
  | "CB-03"
  | "CB-04"
  | "CB-04prime"
  | "CB-05"
  | "CB-06"
  | "CB-07A"
  | "CB-07B"
  | "CB-07C"
  | "CB-07D"
  | "CB-07Dprime"
  | "CB-08"
  | "CB-09"
  | "CB-10"
  | "CB-11"
  | "CB-11prime"
  | "CB-12"
  | "CB-13"
  | "CB-14"
  | "CB-14prime";

export type AppScreen = {
  id: ScreenId;
  label: string;
  name: string;
  href: string;
  nav?: "home" | "rooms" | "my" | "profile";
};

export type SearchParams = Record<string, string | string[] | undefined>;

export const SCREEN_ROUTES: AppScreen[] = [
  { id: "CB-01", label: "CB-01", name: "Login", href: "/login" },
  { id: "CB-02", label: "CB-02", name: "Nickname", href: "/nickname" },
  { id: "CB-03", label: "CB-03", name: "Home", href: "/home", nav: "home" },
  { id: "CB-04", label: "CB-04", name: "Room List", href: "/rooms", nav: "rooms" },
  { id: "CB-04prime", label: "CB-04′", name: "Tag Modal", href: "/rooms?modal=tags", nav: "rooms" },
  { id: "CB-05", label: "CB-05", name: "Create Room", href: "/rooms/create", nav: "rooms" },
  { id: "CB-06", label: "CB-06", name: "My Rooms", href: "/my-rooms", nav: "my" },
  { id: "CB-07A", label: "CB-07A", name: "Room Detail - Host", href: "/rooms/host", nav: "rooms" },
  { id: "CB-07B", label: "CB-07B", name: "Room Detail - Member", href: "/rooms/member", nav: "rooms" },
  { id: "CB-07C", label: "CB-07C", name: "Room Detail - Pending", href: "/rooms/pending", nav: "rooms" },
  { id: "CB-07D", label: "CB-07D", name: "Room Detail - Visitor", href: "/rooms/visitor", nav: "rooms" },
  { id: "CB-07Dprime", label: "CB-07D′", name: "Apply Modal", href: "/rooms/visitor?modal=apply", nav: "rooms" },
  { id: "CB-08", label: "CB-08", name: "Open Chat Modal", href: "/rooms/member?modal=open-chat", nav: "rooms" },
  { id: "CB-09", label: "CB-09", name: "Timeline", href: "/timeline", nav: "my" },
  { id: "CB-10", label: "CB-10", name: "Place Search", href: "/places", nav: "my" },
  { id: "CB-11", label: "CB-11", name: "Timetable Edit", href: "/timetable", nav: "my" },
  { id: "CB-11prime", label: "CB-11′", name: "Over-Time Warning", href: "/timetable?modal=warning", nav: "my" },
  { id: "CB-12", label: "CB-12", name: "Map View", href: "/map", nav: "my" },
  { id: "CB-13", label: "CB-13", name: "Memory Feed", href: "/memories", nav: "my" },
  { id: "CB-14", label: "CB-14", name: "Profile", href: "/profile", nav: "profile" },
  { id: "CB-14prime", label: "CB-14′", name: "Profile Edit", href: "/profile/edit", nav: "profile" }
];

export function getScreenById(id: ScreenId) {
  const screen = SCREEN_ROUTES.find((item) => item.id === id);
  if (!screen) throw new Error(`Unknown screen id: ${id}`);
  return screen;
}

export function resolveScreenFromSlug(slug: string[], searchParams: SearchParams): AppScreen | undefined {
  const path = `/${slug.join("/")}`;
  const modal = firstParam(searchParams.modal);
  const room = slug[0] === "rooms" && slug[1] ? rooms.find((item) => item.id === slug[1]) : undefined;

  if (path === "/") return getScreenById("CB-01");
  if (path === "/home") return getScreenById("CB-03");
  if (path === "/rooms" && modal === "tags") return getScreenById("CB-04prime");
  if ((path === "/rooms/host" || path === "/rooms/member") && modal === "open-chat") return getScreenById("CB-08");
  if (path === "/rooms/visitor" && modal === "apply") return getScreenById("CB-07Dprime");
  if (room && (room.status === "host" || room.status === "member") && modal === "open-chat") return getScreenById("CB-08");
  if (room?.status === "visitor" && modal === "apply") return getScreenById("CB-07Dprime");
  if (room) return getScreenById(screenIdByRoomStatus(room.status));
  if (path === "/timetable" && modal === "warning") return getScreenById("CB-11prime");

  const match = SCREEN_ROUTES.find((screen) => screen.href.split("?")[0] === path);
  return match;
}

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Validates a query-supplied return path so back-navigation can only target in-app routes.
// Guards against open redirects: must be an absolute in-app path ("/...") and must not be a
// protocol-relative ("//host") or backslash-smuggled ("/\\host") URL. Returns the path when
// safe, otherwise null so callers can fall back to a known-good destination.
export function safeInternalPath(
  value: string | string[] | undefined,
): string | null {
  const path = firstParam(value);
  if (!path || path[0] !== "/") return null;
  if (path[1] === "/" || path[1] === "\\") return null;
  return path;
}

function screenIdByRoomStatus(status: RoomStatus): ScreenId {
  const screenByStatus: Record<RoomStatus, ScreenId> = {
    host: "CB-07A",
    member: "CB-07B",
    pending: "CB-07C",
    visitor: "CB-07D"
  };

  return screenByStatus[status];
}
