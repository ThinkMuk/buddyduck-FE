import type { AgeRange, Gender } from "@/lib/auth/profile";

// enum → 한글 label, mirroring the Korean labels CB-02 maps the other direction
// (app/nickname/_lib/profile-mapping.ts). Used to render PROFILE-001's ageRange/gender.
const AGE_RANGE_LABEL: Record<AgeRange, string> = {
  TEENS: "10대",
  TWENTIES: "20대",
  THIRTIES: "30대",
  FORTIES_PLUS: "40대+",
};

const GENDER_LABEL: Record<Gender, string> = {
  FEMALE: "여성",
  MALE: "남성",
};

export function getAgeRangeLabel(ageRange: AgeRange | null): string | null {
  return ageRange ? AGE_RANGE_LABEL[ageRange] : null;
}

export function getGenderLabel(gender: Gender | null): string | null {
  return gender ? GENDER_LABEL[gender] : null;
}

// Builds the "20대 · 여성" meta line from the (nullable) ageRange/gender.
// When neither is set (profileCompleted=false), falls back to a prompt to finish onboarding.
export function buildProfileMeta(
  ageRange: AgeRange | null,
  gender: Gender | null,
): string {
  const parts = [getAgeRangeLabel(ageRange), getGenderLabel(gender)].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(" · ") : "추가 정보 미입력";
}

// Avatar initial: first grapheme of the nickname, uppercased.
export function getAvatarInitial(nickname: string): string {
  const first = Array.from(nickname)[0] ?? "?";
  return first.toUpperCase();
}
