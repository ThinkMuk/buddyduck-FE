import { Check, Loader2, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// CB-10 route-local presentational row. Purely visual — it owns no fetching/mutation
// logic; the orchestrator (place-search-screen) passes the display strings and callbacks.
export type PlaceResultRowProps = {
  title: string;
  meta: string;
  sub: string;
  variant: "place" | "address";
  added: boolean;
  pending: boolean;
  onAdd: () => void;
  resultKey: string;
};

export function PlaceResultRow({
  title,
  meta,
  sub,
  variant,
  added,
  pending,
  onAdd,
  resultKey,
}: PlaceResultRowProps) {
  const isAddress = variant === "address";
  const label = added ? "추가됨" : pending ? "추가 중" : "추가";

  return (
    <div
      data-place-result={resultKey}
      className="flex items-center gap-3 border-b border-[var(--cb-line)] py-[13px]"
    >
      {isAddress ? (
        <div className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[14px] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow)]">
          <MapPin size={20} fill="currentColor" strokeWidth={0} />
        </div>
      ) : (
        <div className="ph grid h-[50px] w-[50px] shrink-0 place-items-end rounded-[14px] p-2 text-[9px] font-semibold tracking-[.06em] text-white/40">
          IMG
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{title}</div>
        <div className="mt-[3px] truncate text-[11.5px] text-[var(--cb-text-2)]">{meta}</div>
        <div className="mt-0.5 truncate text-[11px] text-[var(--cb-text-3)]">{sub}</div>
      </div>
      <button
        aria-label={label}
        className={cn(
          "inline-flex h-[34px] shrink-0 items-center gap-1 rounded-[var(--r-pill)] border px-[13px] text-[12px] font-bold transition duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:focus-visible:outline-none",
          added
            ? "border-[var(--cb-line-2)] bg-transparent text-[var(--cb-text-3)] disabled:hover:bg-transparent"
            : "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)] hover:border-[var(--cb-yellow)] hover:bg-[rgba(253,190,13,.22)]",
        )}
        disabled={added || pending}
        onClick={onAdd}
        type="button"
      >
        {added ? (
          <Check size={13} />
        ) : pending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Plus size={13} />
        )}
        {label}
      </button>
    </div>
  );
}
