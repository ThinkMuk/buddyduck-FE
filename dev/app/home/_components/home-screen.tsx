"use client";

import { useMemo, useState } from "react";
import { AppBar } from "@/components/ui";
import { useConcertListInfinite } from "@/lib/api/concerts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ConcertSearchBar } from "./concert-search-bar";
import { ConcertFeed } from "./concert-feed";

export function HomeScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useConcertListInfinite({
      keyword: debouncedQuery.trim() || undefined,
    });

  const concerts = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  return (
    <>
      <AppBar
        left={
          <h1 className="text-[21px] font-bold leading-none tracking-[-.02em]">
            공연 찾기
          </h1>
        }
      />
      <div className="body-scroll">
        <ConcertSearchBar value={query} onChange={setQuery} />
        <div className="mb-3 mt-4 text-[15px] font-bold tracking-[-.01em]">
          다가오는 공연
        </div>
        <ConcertFeed
          concerts={concerts}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={Boolean(hasNextPage)}
          onLoadMore={() => {
            void fetchNextPage();
          }}
        />
      </div>
    </>
  );
}
