"use client";

import { Search } from "lucide-react";

export function ConcertSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-2 flex h-[46px] items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 text-[13.5px] text-[var(--cb-text-3)]">
      <Search size={18} aria-hidden="true" />
      <input
        aria-label="공연 검색"
        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--cb-text)] outline-none placeholder:text-[var(--cb-text-3)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="공연명 / 지역 검색"
        type="search"
        value={value}
      />
    </label>
  );
}
