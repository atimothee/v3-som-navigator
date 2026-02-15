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
                  <nav className="site-nav">
                    <Link href="/">Home</Link>
                    <Link href="/chat">Chat</Link>
                    <Link href="/account/profile-document">Profile doc</Link>
                  </nav>
                  <UserButton />
                </SignedIn>
              </header>
              <div className="page-content">{children}</div>
              <footer className="site-footer">
                <p className="footer-credit">
                  Built by{" "}
                  <Link
                    href="https://www.linkedin.com/in/timothyasiimwe/"
                    target="_blank"
                    rel="noreferrer"
                    
                  >
                    Timo
                  </Link>
                  ,{" "}
                  <Link
                    href="https://www.linkedin.com/in/psgca/"
                    target="_blank"
                    rel="noreferrer"
                    
                  >
                    Parm
                  </Link>{" "}
                  &amp;{" "}
                  <Link
                    href="https://www.linkedin.com/in/aniket-agg/"
                    target="_blank"
                    rel="noreferrer"
                    
                  >
                    Aniket
                  </Link>
                </p>
                <p className="footer-feedback">
                  Found issue?{" "}
                  <Link
                    href="https://forms.gle/pjzU8X8eKQ4YMRrq9"
                    target="_blank"
                    rel="noreferrer"
                    
                  >
                    Give us feedback
                  </Link>
                  .
                </p>
              </footer>
            </div>
          </Theme>
        </body>
      </html>
    </ClerkProvider>
  );
}
