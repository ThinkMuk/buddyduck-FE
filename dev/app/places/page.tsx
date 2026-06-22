import { ScreenShell } from "../_components/screen-shell";
import { getScreenById, type SearchParams } from "../_lib/routes";
import { PlaceSearchScreen } from "./_components/place-search-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // PlaceSearchScreen reads ?roomId=/?concertId= via useSearchParams; awaiting searchParams
  // here marks the route dynamic so the client hook doesn't trip the static CSR bailout.
  await searchParams;

  return (
    <ScreenShell screen={getScreenById("CB-10")}>
      <PlaceSearchScreen />
    </ScreenShell>
  );
}
