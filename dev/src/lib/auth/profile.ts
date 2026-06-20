import { useMutation } from "@tanstack/react-query";
import { http } from "@/lib/api/http";

export type AgeRange = "TEENS" | "TWENTIES" | "THIRTIES" | "FORTIES_PLUS";
export type Gender = "FEMALE" | "MALE";

type CompleteProfilePayload = {
  nickname: string;
  ageRange: AgeRange;
  gender: Gender;
};

// Transcribed field-for-field from PROFILE-002's Response table (result.*),
// including nullability: ageRange/gender are Nullable=Y, the rest Nullable=N.
export type CompleteProfileResult = {
  id: number;
  nickname: string;
  ageRange: AgeRange | null;
  gender: Gender | null;
  profileCompleted: boolean;
  avatarColor: string;
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

export async function completeProfile(
  payload: CompleteProfilePayload,
): Promise<CompleteProfileResult> {
  const response = await http.patch<ApiEnvelope<CompleteProfileResult>>(
    "/api/users/me/profile",
    payload,
  );
  return response.data.result;
}

export function useCompleteProfileMutation() {
  return useMutation({
    mutationFn: completeProfile,
  });
}
