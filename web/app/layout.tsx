import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "Sloth Butler: say not now, kindly",
  description: "Paste a request you dread. Get a kind, firm reply with one counter-offer, in your style and language, read aloud by a calm butler.",
  icons: { icon: "/icon.svg", apple: "/brand/logo-180.png" },
};
export const viewport: Viewport = { themeColor: "#EEEAE8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={inter.className}>{children}</body></html>;
}
