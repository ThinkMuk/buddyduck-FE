import { notFound } from "next/navigation";
import { ScreenShell } from "../../_components/screen-shell";
import { firstParam, getScreenById, type SearchParams, type ScreenId } from "../../_lib/routes";
import { rooms, type RoomStatus } from "@/lib/data";
import { RoomDetailScreen } from "../_components/room-detail-screen";

const screenByStatus: Record<RoomStatus, ScreenId> = {
  host: "CB-07A",
  member: "CB-07B",
  pending: "CB-07C",
  visitor: "CB-07D"
};

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ roomId }, query] = await Promise.all([params, searchParams]);
  const room = rooms.find((item) => item.id === roomId);

  if (!room) {
    notFound();
  }

  const modal = firstParam(query.modal);
  const showOpenChatModal = (room.status === "host" || room.status === "member") && modal === "open-chat";
  const showApplyModal = room.status === "visitor" && modal === "apply";
  const screenId = showOpenChatModal ? "CB-08" : showApplyModal ? "CB-07Dprime" : screenByStatus[room.status];

  return (
    <ScreenShell screen={getScreenById(screenId)}>
      <RoomDetailScreen roomId={room.id} showOpenChatModal={showOpenChatModal} showApplyModal={showApplyModal} />
    </ScreenShell>
  );
}
