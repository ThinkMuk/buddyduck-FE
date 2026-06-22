"use client";

import { useEffect } from "react";
import { Chip } from "@/components/ui";
import { ROOM_TAGS, getRoomTagLabel } from "@/lib/api/rooms";
import { cn } from "@/lib/utils";

export function TagSelectionSheet({
  title,
  description,
  selectedTags,
  maxTags,
  onToggle,
  onDismiss,
  actions,
}: {
  title: string;
  description: string;
  selectedTags: string[];
  maxTags: number;
  onToggle: (tag: string) => void;
  onDismiss: () => void;
  actions: React.ReactNode;
}) {
  const isAtLimit = selectedTags.length >= maxTags;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      aria-label="모달 배경"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3.5 backdrop-blur-[4px]"
      onClick={onDismiss}
      role="presentation"
    >
      <section
        aria-label={title}
        aria-modal="true"
        className="sheet-enter w-full max-w-[402px] rounded-[var(--r-xl)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-1)] p-4 shadow-[var(--sh-pop)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--cb-yellow-dim)] text-[18px] font-black text-[var(--cb-yellow)]">
            #
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold leading-tight">{title}</h2>
            <p className="mt-1 text-[11.5px] leading-5 text-[var(--cb-text-3)]">
              {description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROOM_TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            const disabled = !active && isAtLimit;

            return (
              <Chip
                active={active}
                aria-pressed={active}
                className={cn(disabled && "opacity-45")}
                disabled={disabled}
                key={tag}
                onClick={() => onToggle(tag)}
                type="button"
              >
                {getRoomTagLabel(tag)}
              </Chip>
            );
          })}
        </div>
        <div className="mt-4 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] p-3 text-[11.5px] leading-5 text-[var(--cb-yellow-2)]">
          선택한 태그로{" "}
          <b className="font-bold text-[var(--cb-yellow)]">방 카드 매칭 수</b>가
          결정돼요. 사용자 정의 태그는 지원하지 않아요.
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">{actions}</div>
      </section>
    </div>
  );
}
