"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppBar } from "@/components/ui";
import { useMyProfile } from "@/lib/api/users";
import { buildProfileMeta, getAvatarInitial } from "../_lib/profile-display";

export function ProfileScreen() {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const noticeIdRef = useRef(0);
  const showWipNotice = useCallback((label: string) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, message: `${label}은 개발중인 기능입니다` });
  }, []);
  useEffect(() => {
    if (!notice) return undefined;

    const timer = window.setTimeout(() => setNotice(null), 1600);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const { data: profile, isLoading: isProfileLoading } = useMyProfile();
  const stats = [
    { label: "참여 중인 방", value: profile?.participatingRoomCount },
    { label: "신청 대기 중인 방", value: profile?.pendingRoomCount }
  ];

  return (
    <>
      <AppBar left={<h1 className="text-[21px] font-bold leading-none tracking-[-.02em]">프로필</h1>} />
      {notice ? (
        <div
          key={notice.id}
          role="status"
          aria-live="polite"
          className="profile-toast pointer-events-none fixed bottom-[76px] left-1/2 z-30 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[rgba(22,22,24,.96)] px-3.5 py-3 text-[12px] font-semibold text-[var(--cb-yellow-2)] shadow-[var(--sh-pop)] backdrop-blur"
        >
          {notice.message}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col overflow-auto px-4 pb-[18px] pt-2">
        <Link
          href="/profile/edit"
          className="flex items-center gap-3.5 rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] p-4 shadow-[var(--sh-card)] transition hover:border-[var(--cb-line-2)]"
        >
          {isProfileLoading || !profile ? (
            <>
              <span className="grid h-[46px] w-[46px] shrink-0 animate-pulse place-items-center rounded-full border border-[var(--cb-line)] bg-[var(--cb-surface-3)]" />
              <span className="min-w-0 flex-1">
                <span className="block h-[17px] w-28 animate-pulse rounded bg-[var(--cb-surface-3)]" />
                <span className="mt-2 block h-[12px] w-20 animate-pulse rounded bg-[var(--cb-surface-3)]" />
              </span>
            </>
          ) : (
            <>
              <span
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-[16px] font-bold text-[var(--cb-on-yellow)] shadow-[0_0_0_1px_var(--cb-yellow-line)]"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {getAvatarInitial(profile.nickname)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold tracking-[-.01em]">{profile.nickname}</span>
                <span className="mt-1 block text-[12.5px] text-[var(--cb-text-2)]">
                  {buildProfileMeta(profile.ageRange, profile.gender)}
                </span>
              </span>
            </>
          )}
          <ChevronRight size={24} className="shrink-0 text-[var(--cb-text-3)]" />
        </Link>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href="/my-rooms"
              className="rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] px-2 py-3.5 text-center transition hover:border-[var(--cb-line-2)]"
            >
              <span className="block text-[20px] font-extrabold text-[var(--cb-yellow)]">
                {isProfileLoading || stat.value === undefined ? "–" : stat.value}
              </span>
              <span className="mt-1 block text-[11px] text-[var(--cb-text-2)]">{stat.label}</span>
            </Link>
          ))}
        </div>

        <ProfileMenuGroup title="설정">
          <ProfileMenuButton label="알림 설정" onClick={showWipNotice} />
          <ProfileMenuButton label="차단한 사용자" value="2명" onClick={showWipNotice} />
          <ProfileMenuButton label="관심 공연 알림" value="ON" onClick={showWipNotice} />
        </ProfileMenuGroup>

        <ProfileMenuGroup title="고객 지원">
          <ProfileMenuButton label="도움말 / FAQ" onClick={showWipNotice} />
          <ProfileMenuButton label="문의하기" onClick={showWipNotice} />
          <ProfileMenuButton label="약관 및 정책" onClick={showWipNotice} />
          <ProfileMenuButton label="앱 버전" value="v1.0.0" onClick={showWipNotice} />
        </ProfileMenuGroup>

        <ProfileMenuGroup title="계정">
          <Link
            href="/login"
            className="flex w-full items-center justify-between border-b border-[var(--cb-line)] px-1 py-[15px] text-left text-[14px] transition hover:text-[var(--cb-yellow)]"
          >
            <span>로그아웃</span>
            <span className="flex items-center gap-1.5 text-[13px] text-[var(--cb-text-3)]">
              <ChevronRight size={16} />
            </span>
          </Link>
          <ProfileMenuButton label="회원 탈퇴" muted onClick={showWipNotice} />
        </ProfileMenuGroup>
      </div>
    </>
  );
}

function ProfileMenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[22px]">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[.1em] text-[var(--cb-text-3)]">{title}</div>
      {children}
    </section>
  );
}

function ProfileMenuButton({
  label,
  value,
  muted,
  onClick
}: {
  label: string;
  value?: string;
  muted?: boolean;
  onClick: (label: string) => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between border-b border-[var(--cb-line)] px-1 py-[15px] text-left text-[14px] transition hover:text-[var(--cb-yellow)]"
      onClick={() => onClick(label)}
      type="button"
    >
      <span className={muted ? "text-[var(--cb-text-3)]" : undefined}>{label}</span>
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--cb-text-3)]">
        {value ? <span>{value}</span> : null}
        <ChevronRight size={16} />
      </span>
    </button>
  );
}
