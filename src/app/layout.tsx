import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "StudyOS",
  description: "AI-powered personal learning operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen lg:flex">
          <Nav />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
