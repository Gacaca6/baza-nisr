import type { Metadata } from "next";
import "@fontsource-variable/lexend";
import "./globals.css";
import "./nisr.css";

export const metadata: Metadata = {
  title: "Baza NISR — Official numbers. Clear answers.",
  description: "Explore Rwanda’s official statistics in Kinyarwanda, English and French with inspectable evidence. Independent hackathon prototype.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
