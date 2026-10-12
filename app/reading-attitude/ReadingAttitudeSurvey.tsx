"use client";

import { useState } from "react";
import {
  ALL_ITEM_IDS,
  GENDER_OPTIONS,
  READING_ATTITUDE_TITLE,
  SCALE,
  SECTIONS,
} from "@/data/readingAttitude";
import { CONSENT_VERSION } from "@/data/readingAttitudeConsent";
import { ConsentEnded, ConsentScreen } from "./ReadingAttitudeConsent";

type Info = {
  institution: string;
  testDate: string;
  gender: string;
  birthDate: string;
};

const EMPTY_INFO: Info = { institution: "", testDate: "", gender: "", birthDate: "" };
const TOTAL = ALL_ITEM_IDS.length;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function ReadingAttitudeSurvey() {
  const [stage, setStage] = useState<"consent" | "ended" | "form">("consent");
  const [info, setInfo] = useState<Info>(EMPTY_INFO);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showMissing, setShowMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const answeredCount = ALL_ITEM_IDS.filter((id) => answers[id] !== undefined).length;
  const pct = Math.round((answeredCount / TOTAL) * 100);

  function missingInfoKeys(): (keyof Info)[] {
    return (Object.keys(EMPTY_INFO) as (keyof Info)[]).filter(
      (k) => info[k].trim().length === 0
    );
  }

  function dateOrderError(): string | null {
    if (info.birthDate && info.testDate && info.birthDate > info.testDate) {
      return "생년월일이 검사일보다 늦습니다. 날짜를 다시 확인해 주세요.";
    }
    return null;
  }

  async function handleSubmit() {
    setError(null);
    const missInfo = missingInfoKeys();
    const missItems = ALL_ITEM_IDS.filter((id) => answers[id] === undefined);

    if (missInfo.length > 0 || missItems.length > 0) {
      setShowMissing(true);
      setError(
        `입력하지 않은 항목이 있습니다. (기본 정보 ${missInfo.length}개, 문항 ${missItems.length}개)`
      );
      scrollToId(missInfo.length > 0 ? `info-${missInfo[0]}` : `item-${missItems[0]}`);
      return;
    }

    const orderError = dateOrderError();
    if (orderError) {
      setError(orderError);
      scrollToId("info-birthDate");
      return;
    }

    const webhookUrl = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL;
    if (!webhookUrl) {
      setError("제출 설정이 되어 있지 않습니다. 관리자에게 문의해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        survey: "reading-attitude",
        submittedAt: new Date().toISOString(),
        consent: { agreed: true, futureUse: true, version: CONSENT_VERSION },
        info: {
          institution: info.institution.trim(),
          testDate: info.testDate,
          gender: info.gender,
          birthDate: info.birthDate,
        },
        answers,
      };
      // Apps Script 웹앱은 응답을 읽을 수 없는 no-cors 방식으로 전송한다 (기존 설문과 동일).
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch {
      setError("제출 중 문제가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  function startNext() {
    // 같은 기관·검사일로 다른 유아를 이어서 입력할 수 있도록 두 항목은 유지한다.
    setInfo((prev) => ({ ...EMPTY_INFO, institution: prev.institution, testDate: prev.testDate }));
    setAnswers({});
    setShowMissing(false);
    setError(null);
    setDone(false);
    window.scrollTo({ top: 0 });
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-3xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-600">
              ✓
            </div>
            <h1 className="mb-1 text-lg font-semibold text-gray-900">제출이 완료되었습니다</h1>
            <p className="mb-6 text-sm text-gray-500">응답해 주셔서 감사합니다.</p>
            <button
              type="button"
              onClick={startNext}
              className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              다른 유아 응답 입력하기
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (stage !== "form") {
    return (
      <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-3xl">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{READING_ATTITUDE_TITLE}</h1>
          </header>
          {stage === "consent" ? (
            <ConsentScreen
              onAgree={() => {
                setStage("form");
                window.scrollTo({ top: 0 });
              }}
              onDecline={() => {
                setStage("ended");
                window.scrollTo({ top: 0 });
              }}
            />
          ) : (
            <ConsentEnded />
          )}
        </div>
      </main>
    );
  }

  const inputClass = (key: keyof Info) =>
    [
      "w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2",
      showMissing && info[key].trim().length === 0
        ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100"
        : "border-gray-300 focus:border-brand-500 focus:ring-brand-100",
    ].join(" ");

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{READING_ATTITUDE_TITLE}</h1>
        </header>

        <div className="sticky top-0 z-20 -mx-4 mb-6 bg-[#f4f6fb]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
          <div className="mb-1.5 flex justify-between text-xs text-gray-500">
            <span>
              응답 {answeredCount} / {TOTAL}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-brand-500 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="mb-5 text-base font-semibold text-gray-900">기본 정보</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div id="info-institution" className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="institution" className="text-sm font-medium text-gray-700">
                기관명 (유치원/어린이집)
              </label>
              <input
                id="institution"
                type="text"
                value={info.institution}
                onChange={(e) => setInfo({ ...info, institution: e.target.value })}
                className={inputClass("institution")}
              />
            </div>

            <div id="info-testDate" className="flex flex-col gap-1.5">
              <label htmlFor="testDate" className="text-sm font-medium text-gray-700">
                검사일
              </label>
              <input
                id="testDate"
                type="date"
                value={info.testDate}
                onChange={(e) => setInfo({ ...info, testDate: e.target.value })}
                className={inputClass("testDate")}
              />
            </div>

            <div id="info-birthDate" className="flex flex-col gap-1.5">
              <label htmlFor="birthDate" className="text-sm font-medium text-gray-700">
                생년월일
              </label>
              <input
                id="birthDate"
                type="date"
                value={info.birthDate}
                onChange={(e) => setInfo({ ...info, birthDate: e.target.value })}
                className={inputClass("birthDate")}
              />
            </div>

            <div id="info-gender" className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">성별</span>
              <div
                role="radiogroup"
                aria-label="성별"
                className={[
                  "grid grid-cols-2 gap-2 rounded-xl",
                  showMissing && !info.gender ? "ring-2 ring-red-200" : "",
                ].join(" ")}
              >
                {GENDER_OPTIONS.map((g) => {
                  const selected = info.gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setInfo({ ...info, gender: g })}
                      className={[
                        "rounded-lg border-2 py-2.5 text-sm font-semibold transition",
                        selected
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50/40",
                      ].join(" ")}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {SECTIONS.map((section) => (
          <section
            key={section.key}
            className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <div className="mb-5 flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">
                {section.numeral}. {section.title}
              </h2>
              <span className="whitespace-nowrap text-xs text-gray-400">
                {SCALE.minLabel} ← → {SCALE.maxLabel}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {section.items.map((item) => {
                const selected = answers[item.id];
                const missing = showMissing && selected === undefined;
                return (
                  <div
                    key={item.id}
                    id={`item-${item.id}`}
                    className={[
                      "rounded-xl border-2 p-4 transition",
                      missing
                        ? "border-red-300 bg-red-50/40"
                        : selected !== undefined
                        ? "border-brand-100 bg-brand-50/30"
                        : "border-gray-200 bg-white",
                    ].join(" ")}
                  >
                    <p
                      className="text-sm font-medium leading-relaxed text-gray-900"
                      style={{ wordBreak: "keep-all" }}
                    >
                      <span className="mr-1.5 text-gray-400">{item.no}.</span>
                      {item.text}
                    </p>

                    <div
                      role="radiogroup"
                      aria-label={`${section.numeral}. ${section.title} ${item.no}번`}
                      className="mt-3 grid grid-cols-5 gap-2"
                    >
                      {SCALE.values.map((v) => {
                        const isSelected = selected === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: v }))}
                            className={[
                              "h-11 rounded-lg border-2 text-sm font-bold transition",
                              isSelected
                                ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                                : "border-gray-200 bg-white text-gray-500 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600",
                            ].join(" ")}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
                      <span>{SCALE.minLabel}</span>
                      <span>{SCALE.maxLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mb-10 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
          >
            {submitting ? "제출 중..." : "제출하기"}
          </button>
        </div>
      </div>
    </main>
  );
}
