import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Manual Builder",
  description: "Create editable PowerPoint and Word manuals from photos and steps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
