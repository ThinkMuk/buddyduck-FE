import type { AgeRange, Gender } from "@/lib/auth/profile";

const AGE_RANGE_MAP: Record<string, AgeRange> = {
  "10대": "TEENS",
  "20대": "TWENTIES",
  "30대": "THIRTIES",
  "40대+": "FORTIES_PLUS",
};

const GENDER_MAP: Record<string, Gender> = {
  여성: "FEMALE",
  남성: "MALE",
};

export function toAgeRange(label: string): AgeRange | undefined {
  return AGE_RANGE_MAP[label];
}

export function toGender(label: string): Gender | undefined {
  return GENDER_MAP[label];
}
