import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Climate Finance Intelligence | IWMI",
  description:
    "Where climate hazard risk is high but climate finance is low: Sri Lanka hazard × CSG finance gap, an India/Zambia drought pilot, and a knowledge bank of climate-risk tools.",
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
