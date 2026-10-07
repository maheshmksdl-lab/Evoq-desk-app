"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { hasSession } from "@/lib/auth";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { DeskHeader } from "./desk-header";
import { DeskSidebar } from "./desk-sidebar";
import { QuickActions } from "./quick-actions";
import { ShellContent, ShellProvider } from "./shell-context";

/** The Desk app frame (header, sidebar, quick actions) around every page except the auth screens. */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const authPage = AUTH_ROUTES.includes(pathname);

  // proxy.ts guards every request, but Back can restore an app page from the browser's cache after
  // log out without asking the server. Check the session whenever a page is shown, and leave if it's gone.
  useEffect(() => {
    if (authPage) return;
    const guard = () => {
      if (!hasSession()) window.location.replace("/login");
    };
    guard();
    window.addEventListener("pageshow", guard);
    return () => window.removeEventListener("pageshow", guard);
  }, [authPage]);

  if (authPage) return children;
  return (
    <ShellProvider>
      <DeskHeader />
      <DeskSidebar />
      <ShellContent>{children}</ShellContent>
      <QuickActions />
    </ShellProvider>
  );
}
