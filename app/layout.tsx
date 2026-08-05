import type { Metadata } from "next";
import "./globals.css";
import "./gateway.css";

export const metadata: Metadata = {
  title: { default: "HomePilot AI Gateway Console", template: "%s · HomePilot Gateway" },
  description: "Private operations console for the HomePilot Google Cloud VM AI gateway.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
