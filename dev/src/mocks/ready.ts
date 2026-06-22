let resolveReady: (() => void) | undefined;

export const mswReadyPromise: Promise<void> =
  process.env.NODE_ENV === "development"
    ? new Promise((resolve) => {
        resolveReady = resolve;
      })
    : Promise.resolve();

export function markMswReady() {
  resolveReady?.();
}
