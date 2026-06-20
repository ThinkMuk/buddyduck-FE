import { useMutation } from "@tanstack/react-query";
import { http } from "@/lib/api/http";

export type AgeRange = "TEENS" | "TWENTIES" | "THIRTIES" | "FORTIES_PLUS";
export type Gender = "FEMALE" | "MALE";

type CompleteProfilePayload = {
  nickname: string;
  ageRange: AgeRange;
  gender: Gender;
};

export function useCompleteProfileMutation() {
  return useMutation({
    mutationFn: (payload: CompleteProfilePayload) =>
      http.patch("/api/users/me/profile", payload),
  });
}
