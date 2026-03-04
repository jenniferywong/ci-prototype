import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brisk Curriculum Intelligence",
  description: "Quiz generation prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
