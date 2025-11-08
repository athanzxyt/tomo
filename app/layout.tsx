import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tomo",
  description: "Phone-native Biographer powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-50 antialiased">{children}</body>
    </html>
  );
}
