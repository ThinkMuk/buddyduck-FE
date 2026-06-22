"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppBar, Chip } from "@/components/ui";
import { BackButton } from "../../../_components/buddy-patterns";
import {
  MY_PROFILE_QUERY_KEY,
  useMyProfile,
  type UserProfile,
} from "@/lib/api/users";
import {
  useCompleteProfileMutation,
  type AgeRange,
  type Gender,
} from "@/lib/auth/profile";
import {
  getAgeRangeLabel,
  getAvatarInitial,
  getGenderLabel,
} from "../../_lib/profile-display";

// PROFILE-002's Request Body requires non-null ageRange/gender (enum), and its 협업 참고
// states the 비공개/visibility field is not used — so the edit form offers the four age
// enums and two gender enums only, both required before save (mirrors CB-02 onboarding).
const AGE_OPTIONS: AgeRange[] = ["TEENS", "TWENTIES", "THIRTIES", "FORTIES_PLUS"];
const GENDER_OPTIONS: Gender[] = ["FEMALE", "MALE"];
// Same nickname contract PROFILE-002 enforces (2~12자, 한글/영문/숫자/_/-).
const NICKNAME_PATTERN = /^[가-힣A-Za-z0-9_-]+$/;

export function ProfileEditScreen() {
  // Prefill source: PROFILE-001 (GET /api/users/me). Shares the ["user","me"] query key
  // with CB-14, so navigating /profile → /profile/edit reuses the cached profile; a direct
  // deep-link to /profile/edit fetches it here. Either way the screen owns the read.
  const { data: profile, isLoading } = useMyProfile();

  return (
    <>
      <AppBar title="프로필 수정" left={<BackButton href="/profile" />} right={<span className="w-[38px]" />} />
      <h1 className="sr-only">프로필 수정</h1>
      {profile ? (
        // Remounting on profile.id seeds the form's useState from the loaded profile once
        // (lint-safe vs. a setState-in-effect). profile.id is stable across background
        // refetches, so in-progress edits are never clobbered.
        <ProfileEditForm key={profile.id} profile={profile} />
      ) : (
        <ProfileEditFallback loading={isLoading} />
      )}
    </>
  );
}

function ProfileEditForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useCompleteProfileMutation();

  const [nickname, setNickname] = useState(profile.nickname);
  const [selectedAge, setSelectedAge] = useState<AgeRange | null>(profile.ageRange);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(profile.gender);

  const nicknameLength = Array.from(nickname).length;
  const isNicknameValid =
    nicknameLength >= 2 &&
    nicknameLength <= 12 &&
    NICKNAME_PATTERN.test(nickname);
  const canSave =
    isNicknameValid &&
    selectedAge !== null &&
    selectedGender !== null &&
    !mutation.isPending;

  const onNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Array.from(event.target.value).slice(0, 12).join("");
    setNickname(nextValue);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave || selectedAge === null || selectedGender === null) return;

    mutation.mutate(
      { nickname, ageRange: selectedAge, gender: selectedGender },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
          router.push("/profile");
        },
      },
    );
  };

  const avatarInitial = getAvatarInitial(nickname || profile.nickname);

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 pb-[18px] pt-2">
        <span
          className="mx-auto mb-[18px] mt-1 flex h-[104px] w-[104px] items-center justify-center rounded-full border border-[var(--cb-line-2)] text-[34px] font-extrabold text-[var(--cb-on-yellow)]"
          style={{ backgroundColor: profile.avatarColor }}
          aria-hidden="true"
        >
          {avatarInitial}
        </span>

        <label className="flex flex-col gap-2">
          <span className="text-[12.5px] font-semibold text-[var(--cb-text-2)]">닉네임</span>
          <input
            aria-describedby="profile-nickname-count"
            className="min-h-[48px] rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 py-3 text-[14px] text-[var(--cb-text)] outline-none placeholder:text-[var(--cb-text-3)] focus:border-[var(--cb-yellow-line)]"
            maxLength={12}
            onChange={onNicknameChange}
            value={nickname}
          />
        </label>
        <div id="profile-nickname-count" className="mt-1 text-right text-[11px] text-[var(--cb-text-3)]">
          {nicknameLength} / 12
        </div>

        <ProfileChoiceGroup
          label="연령대"
          options={AGE_OPTIONS}
          getLabel={getAgeRangeLabel}
          selected={selectedAge}
          onSelect={setSelectedAge}
          className="mt-4"
        />
        <ProfileChoiceGroup
          label="성별"
          options={GENDER_OPTIONS}
          getLabel={getGenderLabel}
          selected={selectedGender}
          onSelect={setSelectedGender}
          className="mt-[18px]"
        />

        <p className="mt-4 text-[11.5px] leading-[1.55] text-[var(--cb-text-3)]">
          연령대·성별은 방장이 승인 여부를 판단할 때 도움이 돼요. 언제든 다시 수정할 수 있습니다.
        </p>
      </div>
      <div className="shrink-0 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_22%)] px-4 py-3">
        <button
          type="submit"
          disabled={!canSave}
          className={
            canSave
              ? "flex h-[54px] w-full items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[15px] font-bold text-[var(--cb-on-yellow)] shadow-[var(--sh-glow)]"
              : "flex h-[54px] w-full cursor-not-allowed items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[15px] font-bold text-[var(--cb-text-3)]"
          }
        >
          {mutation.isPending ? "저장 중" : "저장"}
        </button>
        <p className="mt-2 text-center text-[11px] text-[var(--cb-text-3)]">
          {mutation.isError
            ? "프로필 저장에 실패했어요. 다시 시도해 주세요."
            : canSave
              ? "변경한 정보로 프로필을 업데이트해요."
              : "닉네임, 연령대, 성별을 모두 입력해 주세요."}
        </p>
      </div>
    </form>
  );
}

function ProfileEditFallback({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-4 pb-[18px] pt-2">
      {loading ? (
        <>
          <span className="mx-auto my-1 h-[104px] w-[104px] animate-pulse rounded-full border border-[var(--cb-line-2)] bg-[var(--cb-surface-3)]" />
          <span className="mt-6 h-[48px] w-full animate-pulse rounded-[var(--r-md)] bg-[var(--cb-surface-3)]" />
        </>
      ) : (
        <p className="mt-10 text-[13px] text-[var(--cb-text-2)]">프로필을 불러오지 못했어요.</p>
      )}
    </div>
  );
}

function ProfileChoiceGroup<T extends string>({
  label,
  options,
  getLabel,
  selected,
  onSelect,
  className,
}: {
  label: string;
  options: T[];
  getLabel: (value: T) => string | null;
  selected: T | null;
  onSelect: (value: T) => void;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-[9px] flex items-center gap-2 text-[12.5px] font-semibold text-[var(--cb-text-2)]">
        {label}
        <span className="rounded-[var(--r-pill)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-2 py-0.5 text-[10px] font-bold text-[var(--cb-yellow)]">
          필수
        </span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${label} 선택`}>
        {options.map((option) => (
          <Chip
            key={option}
            active={selected === option}
            aria-pressed={selected === option}
            onClick={() => onSelect(option)}
            type="button"
          >
            {getLabel(option)}
          </Chip>
        ))}
      </div>
    </section>
  );
}
