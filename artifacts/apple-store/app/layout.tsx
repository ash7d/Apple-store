import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteFooter, SiteHeader } from "../components/site-shell";
import { StoreProvider } from "../components/store-provider";

export const metadata: Metadata = {
  title: "Apple Store — Choose what moves you",
  description: "A considered place to explore Apple devices.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><StoreProvider><SiteHeader />{children}<SiteFooter /></StoreProvider></body></html>;
}
