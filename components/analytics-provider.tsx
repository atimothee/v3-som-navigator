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

function getControlType(element: HTMLElement) {
  if (element instanceof HTMLInputElement) return element.type || "text";
  if (element instanceof HTMLTextAreaElement) return "textarea";
  if (element instanceof HTMLSelectElement) return "select";
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

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;

      const formLabel =
        form.dataset.analyticsLabel || form.getAttribute("name") || form.getAttribute("id") || "form";

      trackEvent("UI Form Submitted", {
        path: pathname,
        label: formLabel
      });
    };

    const handleChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;

      // Avoid capturing free-text content and high-volume keystroke-like changes.
      const shouldTrack =
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLInputElement && ["checkbox", "radio", "file", "range"].includes(target.type));

      if (!shouldTrack) return;

      trackEvent("UI Field Changed", {
        path: pathname,
        label: getElementLabel(target),
        type: getControlType(target)
      });
    };

    window.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("submit", handleSubmit, { capture: true });
    window.addEventListener("change", handleChange, { capture: true });

    return () => {
      window.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("submit", handleSubmit, { capture: true });
      window.removeEventListener("change", handleChange, { capture: true });
    };
  }, [pathname]);

  return null;
}
