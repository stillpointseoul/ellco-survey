import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설문 종료",
  description: "본 설문은 종료되었습니다.",
};

export default function ClosedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-gray-900">설문이 종료되었습니다</h1>
        <p className="text-sm text-gray-500">참여해 주셔서 감사합니다.</p>
      </div>
    </main>
  );
}
