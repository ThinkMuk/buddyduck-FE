import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import type { AgeRange, Gender } from "@/lib/auth/profile";

// Transcribed field-for-field from PROFILE-001's Response table (result.*),
// including nullability: ageRange/gender are Nullable=Y, the rest Nullable=N.
export type UserProfile = {
  id: number;
  nickname: string;
  ageRange: AgeRange | null;
  gender: Gender | null;
  profileCompleted: boolean;
  avatarColor: string;
  // 참여 중인 방 수 / 신청 대기 중인 방 수 (server-computed aggregates, non-null).
  participatingRoomCount: number;
  pendingRoomCount: number;
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

export const MY_PROFILE_QUERY_KEY = ["user", "me"] as const;

export async function fetchMyProfile(): Promise<UserProfile> {
  const response = await http.get<ApiEnvelope<UserProfile>>("/api/users/me");
  return response.data.result;
}

// PROFILE-001 (GET /api/users/me) requires a Bearer token and is never MSW-mocked,
// so it always hits NEXT_PUBLIC_API_BASE_URL. There is no MSW registration race to
// gate against (no handler shadows it), so this fires straight on mount.
export function useMyProfile() {
  return useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: fetchMyProfile,
  });
}
