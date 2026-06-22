import { ScreenShell } from "../../_components/screen-shell";
import {
  firstParam,
  getScreenById,
  safeInternalPath,
  type SearchParams,
} from "../../_lib/routes";
import { RoomDetailConnectedScreen } from "../_components/room-detail-connected-screen";

// CB-07A/B/C/D Room Detail — backend-driven via ROOM-003 (GET /api/rooms/{roomId}).
// The viewer's role/permissions come from the response (not the route), so this single
// dynamic route serves all four wireframe states. The numeric roomId arrives from the
// CB-04 room list and the CB-06 my-rooms cards. The static /rooms/{host,member,pending,
// visitor} routes remain as fixture-driven wireframe demos.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ roomId }, query] = await Promise.all([params, searchParams]);
  const modal = firstParam(query.modal);
  const showApplyModal = modal === "apply";
  // CB-08 오픈채팅 모달: AppBar 우측 '오픈채팅' 버튼이 ?modal=open-chat 으로 진입시킨다.
  const showOpenChatModal = modal === "open-chat";
  // Return target carried by the entry link (CB-04 room list / CB-06 my-rooms). Validated
  // to an in-app path; when absent the screen derives /rooms?concertId from the response.
  const backHref = safeInternalPath(query.back) ?? undefined;

  return (
    <ScreenShell screen={getScreenById("CB-07A")}>
      <RoomDetailConnectedScreen
        roomId={roomId}
        showApplyModal={showApplyModal}
        showOpenChatModal={showOpenChatModal}
        backHref={backHref}
      />
    </ScreenShell>
  );
}
