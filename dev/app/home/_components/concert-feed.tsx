"use client";

import { ConcertCard } from "../../_components/buddy-patterns";
import type { ConcertSummary } from "@/lib/api/concerts";
import { useInfiniteScrollTrigger } from "@/hooks/use-infinite-scroll-trigger";

export function ConcertFeed({
  concerts,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: {
  concerts: ConcertSummary[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useInfiniteScrollTrigger({
    onIntersect: onLoadMore,
    enabled: hasNextPage && !isFetchingNextPage,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 pb-1">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-[98px] animate-pulse rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)]"
          />
        ))}
      </div>
    );
  }

  if (concerts.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] px-4 py-8 text-center text-[12.5px] text-[var(--cb-text-3)]">
        조건에 맞는 공연이 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-1">
      {concerts.map((concert) => (
        <ConcertCard key={concert.id} concert={concert} />
      ))}
      <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      {isFetchingNextPage ? (
        <p className="py-2 text-center text-[12px] text-[var(--cb-text-3)]">
          불러오는 중...
        </p>
      ) : null}
    </div>
  );
}
