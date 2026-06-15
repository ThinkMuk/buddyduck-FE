import { ScreenShell } from "../../_components/screen-shell";
import { getScreenById } from "../../_lib/routes";
import { RoomDetailScreen } from "../_components/room-detail-screen";

export default function Page() {
  return (
    <ScreenShell screen={getScreenById("CB-07C")}>
      <RoomDetailScreen roomId="r3" detailHref="/rooms/pending" />
    </ScreenShell>
  );
}
