"use client";

import { AnalyticsBrowser } from "@segment/analytics-next";

let analyticsPromise: ReturnType<typeof AnalyticsBrowser.load> | null = null;

function getAnalytics() {
  const writeKey = process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;
  if (!writeKey) {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = AnalyticsBrowser.load({ writeKey });
  }

  return analyticsPromise;
}

export function trackPage(properties?: Record<string, unknown>) {
  const client = getAnalytics();
  if (!client) return;

  client
    .then(([analytics]) => analytics.page(undefined, properties))
    .catch(() => {});
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  const client = getAnalytics();
  if (!client) return;

  client.then(([analytics]) => analytics.track(event, properties)).catch(() => {});
}
