import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Concurrent Validity_survey 1",
  description: "언어 및 문해 환경 평가 척도 (ELLCO Pre-K) 설문",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
