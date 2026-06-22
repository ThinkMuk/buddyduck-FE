import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
import { useEffect, useState } from "react";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

export type ConcertSummary = {
  id: number;
  title: string;
  venueName: string;
  startAt: string;
  endAt: string | null;
  lat: number;
  lng: number;
  source: string;
  posterUrl: string | null;
  area: string | null;
  genre: string | null;
  timeGuidance: string | null;
  openRoomCount: number;
};

export type ConcertListParams = {
  keyword?: string;
  region?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
};

export type ConcertListResult = {
  items: ConcertSummary[];
  page: number;
  size: number;
  hasNext: boolean;
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

const CONCERT_PAGE_SIZE = 10;

export async function fetchConcertList(
  params: ConcertListParams,
): Promise<ConcertListResult> {
  const response = await http.get<ApiEnvelope<ConcertListResult>>(
    "/api/concerts",
    { params },
  );
  return response.data.result;
}

export function useConcertListInfinite({
  keyword,
  region,
}: {
  keyword?: string;
  region?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useInfiniteQuery({
    queryKey: ["concerts", { keyword, region }],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchConcertList({
        keyword,
        region,
        from: format(new Date(), "yyyy-MM-dd"),
        to: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
        page: pageParam,
        size: CONCERT_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    enabled: ready,
  });
}

export type ConcertDetailResult = ConcertSummary;

export async function fetchConcertDetail(
  concertId: string,
): Promise<ConcertDetailResult> {
  const response = await http.get<ApiEnvelope<ConcertDetailResult>>(
    `/api/concerts/${concertId}`,
  );
  return response.data.result;
}

export function useConcertDetail(concertId: string | null) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["concert", concertId],
    queryFn: () => fetchConcertDetail(concertId!),
    enabled: ready && !!concertId,
  });
}
