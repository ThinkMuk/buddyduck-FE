import { useEffect, useRef } from "react";

export function useInfiniteScrollTrigger({
  onIntersect,
  enabled,
}: {
  onIntersect: () => void;
  enabled: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onIntersect();
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, onIntersect]);

  return sentinelRef;
}
