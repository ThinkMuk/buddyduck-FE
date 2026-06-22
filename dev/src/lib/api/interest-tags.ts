import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

type InterestTagsResult = { tags: string[] };

export async function fetchInterestTags(
  concertId: string,
): Promise<InterestTagsResult> {
  const response = await http.get<ApiEnvelope<InterestTagsResult>>(
    `/api/concerts/${concertId}/interest-tags/me`,
  );
  return response.data.result;
}

export function useInterestTags(concertId: string | null) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["interest-tags", concertId],
    queryFn: () => fetchInterestTags(concertId!),
    enabled: ready && !!concertId,
  });
}

export async function saveInterestTags(
  concertId: string,
  tags: string[],
): Promise<InterestTagsResult> {
  const response = await http.put<ApiEnvelope<InterestTagsResult>>(
    `/api/concerts/${concertId}/interest-tags/me`,
    { tags },
  );
  return response.data.result;
}

export function useSaveInterestTagsMutation(concertId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tags: string[]) => saveInterestTags(concertId!, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interest-tags", concertId] });
      // 저장된 관심태그가 바뀌면 방 목록의 matchCount(서버 계산)도 달라지므로 함께 갱신한다.
      queryClient.invalidateQueries({ queryKey: ["rooms", concertId] });
    },
  });
}
