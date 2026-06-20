import { ScreenShell } from "../../_components/screen-shell";
import { getScreenById, type SearchParams } from "../../_lib/routes";
import { CreateRoomScreen } from "./_components/create-room-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await searchParams;
  return (
    <ScreenShell screen={getScreenById("CB-05")}>
      <CreateRoomScreen />
    </ScreenShell>
  );
}
