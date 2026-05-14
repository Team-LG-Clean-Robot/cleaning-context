import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "생활 맥락 로봇청소기 시뮬레이터 | 럭키 금성",
  description:
    "LG 로봇청소기가 상황·맥락을 이해해 어디를·언제·어떻게 청소할지 결정하고, 그 이유를 자연어로 설명하는 Physical AI Agent 시뮬레이터.",
  openGraph: {
    title: "생활 맥락 로봇청소기 시뮬레이터",
    description:
      "AI 가전의 의사결정 UX를 설계하는 실험 — 럭키 금성 · LG전자 가전 멘토링.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&display=swap"
        />
      </head>
      <body className="bg-paper text-ink font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
