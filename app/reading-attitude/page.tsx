import type { Metadata } from "next";
import ReadingAttitudeSurvey from "./ReadingAttitudeSurvey";

export const metadata: Metadata = {
  title: "유아 책 읽기태도 질문지",
  description: "유아 책 읽기태도 질문지",
};

export default function Page({
  searchParams,
}: {
  searchParams: { c?: string | string[] };
}) {
  const raw = searchParams.c;
  const classCode = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return <ReadingAttitudeSurvey classCode={classCode.trim()} />;
}
