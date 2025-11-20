"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackEvent, trackPage } from "@/lib/analytics";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    trackPage({ path: pathname, url });
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const labeledElement = target.closest("[data-analytics-label]") as HTMLElement | null;
      const text =
        labeledElement?.innerText?.trim() ||
        target.innerText?.trim() ||
        labeledElement?.tagName?.toLowerCase() ||
        target.tagName.toLowerCase();

      trackEvent("UI Click", {
        path: pathname,
        label: text?.slice(0, 120) || "unknown"
      });
    };

    window.addEventListener("click", handleClick, { capture: true });
    return () => window.removeEventListener("click", handleClick, { capture: true });
  }, [pathname]);

  return null;
}
