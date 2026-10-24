import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "Sloth-Butler: replies to the messages you dread",
  description: "For the messages that cost you time and money. Paste a message about scope creep, discounts, late invoices or last-minute asks. Get a polite, firm reply with one counter-offer.",
  icons: { icon: "/icon.svg", apple: "/brand/logo-180.png" },
};
export const viewport: Viewport = { themeColor: "#14110E", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={inter.className}>{children}</body></html>;
}
