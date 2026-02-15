import "@radix-ui/themes/styles.css";
import "./globals.css";

import { AnalyticsIdentify } from "@/components/analytics-identify";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { NonYaleRedirect } from "@/components/non-yale-redirect";
import { Theme } from "@radix-ui/themes";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { ReactNode, Suspense } from "react";

const font = Space_Grotesk({
  subsets: ["latin"],
  display: "swap"
});

const clerkAppearance = {
  elements: {
    socialButtonsRoot: {
      display: "none"
    },
    socialButtons: {
      display: "none"
    },
    dividerRow: {
      display: "none"
    }
  }
};

export const metadata: Metadata = {
  title: "SOM Network Navigator",
  description: "Navigate the SOM network, one coffee chat at a time."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className={font.className}>
        <body>
          <Theme appearance="dark" accentColor="indigo" grayColor="sand">
            <Suspense fallback={null}>
              <AnalyticsProvider />
              <AnalyticsIdentify />
            </Suspense>
            <NonYaleRedirect />
            <div className="page-shell">
              <header className="site-header">
                <SignedOut>
                  <SignInButton mode="modal" />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </header>
              <div className="page-content">{children}</div>
              <footer className="site-footer">
                <span>
                  Built by{" "}
                  <Link
                    href="https://www.linkedin.com/in/timothyasiimwe/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "underline" }}
                  >
                    Timo
                  </Link>
                  ,{" "}
                  <Link
                    href="https://www.linkedin.com/in/psgca/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "underline" }}
                  >
                    Parm
                  </Link>{" "}
                  &amp;{" "}
                  <Link
                    href="https://www.linkedin.com/in/aniket-agg/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "underline" }}
                  >
                    Aniket
                  </Link>
                </span>
              </footer>
            </div>
          </Theme>
        </body>
      </html>
    </ClerkProvider>
  );
}
