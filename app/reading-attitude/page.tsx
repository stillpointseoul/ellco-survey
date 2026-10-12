import type { Metadata } from "next";
import ReadingAttitudeSurvey from "./ReadingAttitudeSurvey";

export const metadata: Metadata = {
  title: "유아 책 읽기태도 질문지",
  description: "유아 책 읽기태도 질문지",
};

export default function Page() {
  return <ReadingAttitudeSurvey />;
}
