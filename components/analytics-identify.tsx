"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { identifyUser } from "@/lib/analytics";

export function AnalyticsIdentify() {
  const { isLoaded, isSignedIn, user } = useUser();
  const latestUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    if (latestUserId.current === user.id) return;

    latestUserId.current = user.id;
    identifyUser(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName
    });
  }, [isLoaded, isSignedIn, user]);

  return null;
}
