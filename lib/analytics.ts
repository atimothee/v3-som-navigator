"use client";

import { AnalyticsBrowser } from "@segment/analytics-next";

type AnalyticsClient = Awaited<ReturnType<typeof AnalyticsBrowser.load>>;

let analyticsPromise: Promise<AnalyticsClient> | null = null;

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

  client.then((analytics) => analytics.page(properties)).catch(() => {});
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  const client = getAnalytics();
  if (!client) return;

  client.then((analytics) => analytics.track(event, properties)).catch(() => {});
}
