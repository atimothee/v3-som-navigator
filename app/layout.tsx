import "@radix-ui/themes/styles.css";
import "./globals.css";

import { Theme } from "@radix-ui/themes";
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
    <html lang="en" className={font.className}>
      <body>
        <Theme appearance="dark" accentColor="indigo" grayColor="sand">
          {children}
        </Theme>
      </body>
    </html>
  );
}
