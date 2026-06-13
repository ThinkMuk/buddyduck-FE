"use client";

import { BottomNav } from "./ui";
import type { AppScreen } from "@/lib/routes";

export function AppShell({
  screen,
  children,
  showNav = true
}: {
  screen: AppScreen;
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <main className="app-stage">
      <div className="screen">
        {children}
        {showNav ? <BottomNav active={screen.nav} /> : null}
      </div>
    </main>
  );
}

export const MobileShell = AppShell;
