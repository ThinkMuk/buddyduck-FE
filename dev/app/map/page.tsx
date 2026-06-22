import { ScreenShell } from "../_components/screen-shell";
import { firstParam, getScreenById, type SearchParams } from "../_lib/routes";
import { MapScreen } from "./_components/map-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const roomIdParam = firstParam(query.roomId);
  const parsedRoomId = roomIdParam ? Number(roomIdParam) : NaN;
  const roomId = Number.isFinite(parsedRoomId) ? parsedRoomId : null;

  return (
    <ScreenShell screen={getScreenById("CB-12")}>
      <MapScreen roomId={roomId} />
    </ScreenShell>
  );
}
