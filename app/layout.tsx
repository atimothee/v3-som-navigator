import "@radix-ui/themes/styles.css";
import "./globals.css";

import { Theme } from "@radix-ui/themes";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";

const font = Space_Grotesk({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "SOM Network Navigator",
  description: "Navigate the SOM network, one coffee chat at a time."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={font.className}>
        <body>
          <Theme appearance="dark" accentColor="indigo" grayColor="sand">
            <div className="page-shell">
              <header className="site-header">
                <SignedOut>
                  <SignInButton mode="modal" />
                  <SignUpButton mode="modal" />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </header>
              <div className="page-content">{children}</div>
              <footer className="site-footer">
                <span>Built by Timo, Parm &amp; Aniket</span>
              </footer>
            </div>
          </Theme>
        </body>
      </html>
    </ClerkProvider>
  );
}
