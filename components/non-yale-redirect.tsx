"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const ALLOWED_EMAIL_DOMAIN = "yale.edu";

function isYaleEmail(email: string) {
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export function NonYaleRedirect() {
  const { isLoaded, user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    const primaryEmail =
      user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;

    if (!primaryEmail || isYaleEmail(primaryEmail) || pathname === "/unauthorized") {
      return;
    }

    router.replace("/unauthorized");
  }, [isLoaded, pathname, router, user]);

  return null;
}
