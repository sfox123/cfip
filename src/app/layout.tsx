import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Climate Finance Intelligence | IWMI",
  description:
    "District-level drought risk, finance flows and finance gaps for India and Zambia, plus a knowledge bank of drought and climate-risk tools.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
