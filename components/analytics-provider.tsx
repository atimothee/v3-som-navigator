"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackEvent, trackPage } from "@/lib/analytics";

function getElementLabel(element: HTMLElement) {
  const explicitLabel = element.dataset.analyticsLabel;
  if (explicitLabel) return explicitLabel;

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  const text = element.innerText?.trim();
  if (text) return text.slice(0, 120);

  const name = element.getAttribute("name");
  if (name) return name;

  const id = element.getAttribute("id");
  if (id) return id;

  return element.tagName.toLowerCase();
}

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

      const interactiveElement = target.closest(
        "button, a, summary, [role='button'], [data-analytics-label]"
      ) as HTMLElement | null;
      if (!interactiveElement) return;

      trackEvent("UI Click", {
        path: pathname,
        label: getElementLabel(interactiveElement)
      });
    };

    window.addEventListener("click", handleClick, { capture: true });
    return () => window.removeEventListener("click", handleClick, { capture: true });
  }, [pathname]);

  return null;
}
