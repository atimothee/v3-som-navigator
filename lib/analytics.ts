"use client";

import { AnalyticsBrowser } from "@segment/analytics-next";

let analyticsPromise: ReturnType<typeof AnalyticsBrowser.load> | null = null;
let warnedMissingKey = false;
const debugAnalytics = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";

const logDebug = (...args: unknown[]) => {
  if (debugAnalytics) {
    // eslint-disable-next-line no-console
    console.warn("[analytics]", ...args);
  }
};

function getAnalytics() {
  const writeKey = process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;
  if (!writeKey) {
    if (!warnedMissingKey) {
      logDebug("Segment write key missing; set NEXT_PUBLIC_SEGMENT_WRITE_KEY");
      warnedMissingKey = true;
    }
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = AnalyticsBrowser.load({ writeKey });
    analyticsPromise.catch((err) => logDebug("Segment client failed to load", err));
  }

  return analyticsPromise;
}

export function trackPage(properties?: Record<string, unknown>) {
  const client = getAnalytics();
  if (!client) return;

  client
    .then(([analytics]) => analytics.page(undefined, properties))
    .catch((err) => logDebug("trackPage failed", err));
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  const client = getAnalytics();
  if (!client) return;

  client.then(([analytics]) => analytics.track(event, properties)).catch((err) => logDebug(`trackEvent '${event}' failed`, err));
}
