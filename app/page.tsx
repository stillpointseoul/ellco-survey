"use client";

import { useMemo, useState } from "react";
import { INTRO_FIELDS, QUESTIONS } from "@/data/questions";

type Step = "intro" | number | "review" | "done";

export default function Page() {
  const [step, setStep] = useState<Step>("intro");
  const [intro, setIntro] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [fromReview, setFromReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = QUESTIONS.length;
  const currentIndex = typeof step === "number" ? step : -1;

  const introComplete = useMemo(
    () => INTRO_FIELDS.every((f) => (intro[f.key] ?? "").toString().trim().length > 0),
    [intro]
  );

  const answeredCount = Object.keys(answers).length;

  function updateIntro(key: string, value: string) {
    setIntro((prev) => ({ ...prev, [key]: value }));
  }

  function selectAnswer(qid: string, score: number) {
    setAnswers((prev) => ({ ...prev, [qid]: score }));
  }

  function goNext() {
    if (step === "intro") {
      setStep(0);
      return;
    }
    if (typeof step === "number") {
      if (fromReview) {
        setFromReview(false);
        setStep("review");
      } else if (step + 1 < totalSteps) {
        setStep(step + 1);
      } else {
        setStep("review");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goPrev() {
    if (step === "review") {
      setStep(totalSteps - 1);
      return;
    }
    if (typeof step === "number") {
      if (fromReview) {
        setFromReview(false);
        setStep("review");
        return;
      }
      if (step === 0) setStep("intro");
      else setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function jumpToQuestion(i: number) {
    setFromReview(true);
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToReview() {
    setFromReview(false);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        submittedAt: new Date().toISOString(),
        intro,
        answers: QUESTIONS.map((q) => ({
          no: q.no,
          section: q.section,
          title: q.title,
          score: answers[q.id] ?? "",
        })),
      };
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `제출 실패 (status ${res.status})`);
      }
      setStep("done");
    } catch (e: any) {
      setError(e.message ?? "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <Header />

        {step !== "intro" && step !== "done" && (
          <ProgressBar
            current={step === "review" ? totalSteps : currentIndex + 1}
            total={totalSteps}
          />
        )}

        {step === "intro" && (
          <IntroForm
            intro={intro}
            onChange={updateIntro}
            onNext={goNext}
            canProceed={introComplete}
          />
        )}

        {typeof step === "number" && (
          <QuestionCard
            question={QUESTIONS[step]}
            selected={answers[QUESTIONS[step].id]}
            onSelect={(score) => selectAnswer(QUESTIONS[step].id, score)}
            onNext={goNext}
            onPrev={goPrev}
            isLast={step === totalSteps - 1}
            fromReview={fromReview}
            onBackToReview={backToReview}
          />
        )}

        {step === "review" && (
          <ReviewStep
            answers={answers}
            total={totalSteps}
            onPrev={goPrev}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
            onJump={jumpToQuestion}
          />
        )}

        {step === "done" && <DoneScreen />}
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-brand-600">언어 및 문해 환경 평가 척도</p>
      <h1 className="text-2xl font-bold text-gray-900 mt-1">
        ELLCO Pre-K 교실 관찰 설문
      </h1>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>
          {current} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function IntroForm({
  intro,
  onChange,
  onNext,
  canProceed,
}: {
  intro: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">기본 정보 입력</h2>
      <p className="text-sm text-gray-500 mb-6">
        설문을 시작하기 전에 아래 정보를 입력해 주세요.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INTRO_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={intro[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          설문 시작하기
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  onSelect,
  onNext,
  onPrev,
  isLast,
  fromReview,
  onBackToReview,
}: {
  question: (typeof QUESTIONS)[number];
  selected?: number;
  onSelect: (score: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
  fromReview: boolean;
  onBackToReview: () => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayScore = hovered ?? selected ?? null;
  const displayLevel = question.levels.find((l) => l.score === displayScore) ?? null;
  const orderedLevels = question.levels; // already 5,4,3,2,1
  const selectedPos = selected
    ? orderedLevels.findIndex((l) => l.score === selected)
    : -1;
  const fillPct =
    selectedPos >= 0 ? (selectedPos / (orderedLevels.length - 1)) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      {fromReview && (
        <button
          onClick={onBackToReview}
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          ← 검토 화면으로 돌아가기
        </button>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">
        {question.section} · {question.no}번
      </p>
      <h2 className="text-xl font-bold text-gray-900 mb-3">{question.title}</h2>
      <div className="flex flex-wrap gap-1.5 mb-8">
        {question.criteria.map((c) => (
          <span
            key={c}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
          >
            {c}
          </span>
        ))}
      </div>

      {/* Horizontal gauge */}
      <div className="mb-2 flex justify-between text-xs font-semibold text-gray-400">
        <span className="text-brand-600">5 · 매우 우수함</span>
        <span className="text-gray-500">매우 부적합함 · 1</span>
      </div>
      <div
        className="relative flex items-center justify-between px-1 py-3"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="absolute left-1 right-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
        <div
          className="absolute left-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-400 transition-all duration-200"
          style={{ width: `${fillPct}%`, maxWidth: "calc(100% - 8px)" }}
        />
        {orderedLevels.map((level) => {
          const isSelected = selected === level.score;
          return (
            <button
              key={level.score}
              onMouseEnter={() => setHovered(level.score)}
              onClick={() => onSelect(level.score)}
              className={[
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                isSelected
                  ? "border-brand-500 bg-brand-500 text-white shadow-md scale-110"
                  : "border-gray-300 bg-white text-gray-500 hover:border-brand-400 hover:text-brand-600",
              ].join(" ")}
              aria-label={`${level.score}점 - ${level.label}`}
            >
              {level.score}
            </button>
          );
        })}
      </div>
      <div className="mb-8 flex justify-between text-[11px] text-gray-400 px-1">
        {orderedLevels.map((level) => (
          <span key={level.score} className="w-10 text-center">
            {level.label}
          </span>
        ))}
      </div>

      {/* Detail panel for hovered/selected level */}
      <div className="min-h-[220px] rounded-xl border-2 border-dashed border-gray-200 p-5">
        {displayLevel ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {displayLevel.score}
              </span>
              <span className="text-sm font-bold text-gray-900">{displayLevel.label}</span>
            </div>
            <p className="mb-3 text-sm font-medium leading-relaxed text-gray-800">
              {displayLevel.headline}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-gray-600">
              {displayLevel.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="flex h-full min-h-[180px] items-center justify-center text-sm text-gray-400">
            위 게이지에서 점수를 선택하거나 마우스를 올려 내용을 확인하세요.
          </p>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100"
        >
          {fromReview ? "검토 화면으로" : "이전"}
        </button>
        <button
          onClick={onNext}
          disabled={selected === undefined}
          className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {fromReview ? "저장하고 검토 화면으로" : isLast ? "검토하기" : "다음"}
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  answers,
  total,
  onPrev,
  onSubmit,
  submitting,
  error,
  onJump,
}: {
  answers: Record<string, number>;
  total: number;
  onPrev: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  onJump: (i: number) => void;
}) {
  const answeredCount = Object.keys(answers).length;
  const complete = answeredCount === total;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">제출 전 확인</h2>
      <p className="text-sm text-gray-500 mb-6">
        총 {total}개 문항 중 {answeredCount}개를 응답했습니다. 문항을 클릭하면 수정할 수 있습니다.
      </p>

      <div className="mb-6 flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
        {QUESTIONS.map((q) => {
          const done = answers[q.id] !== undefined;
          return (
            <button
              key={q.id}
              onClick={() => onJump(QUESTIONS.indexOf(q))}
              className="flex items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-50/60"
            >
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done ? "bg-brand-500 text-white" : "border-2 border-gray-300 text-gray-400",
                ].join(" ")}
              >
                {done ? "✓" : q.no}
              </span>
              <span className="flex-1 truncate text-sm text-gray-800">
                <span className="mr-2 text-xs font-semibold text-gray-400">{q.no}.</span>
                {q.title}
              </span>
              {done && (
                <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {answers[q.id]}점
                </span>
              )}
              {!done && (
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">
                  미응답
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100"
        >
          이전
        </button>
        <button
          onClick={onSubmit}
          disabled={!complete || submitting}
          className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting ? "제출 중..." : "제출하기"}
        </button>
      </div>
    </div>
  );
}

function DoneScreen() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-2xl">
        ✓
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">제출이 완료되었습니다</h2>
      <p className="text-sm text-gray-500">응답해 주셔서 감사합니다.</p>
    </div>
  );
}
