"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ALL_ITEM_IDS,
  READING_ATTITUDE_TITLE,
  SCALE,
  SECTIONS,
} from "@/data/readingAttitude";

type Info = {
  institution: string;
  evalDate: string;
  childAge: string;
  classSize: string;
  region: string;
};
type Progress = { label: string; size: number; done: number[] };
type Stage = "loading" | "invalid" | "grid" | "form" | "done";

const EMPTY_INFO: Info = { institution: "", evalDate: "", childAge: "", classSize: "", region: "" };

const INFO_FIELDS: { key: keyof Info; label: string; placeholder: string }[] = [
  { key: "institution", label: "소속 기관명", placeholder: "" },
  { key: "evalDate", label: "평가일", placeholder: "예: 2026-10-13" },
  { key: "childAge", label: "담당 유아 연령", placeholder: "예: 만 4세" },
  { key: "classSize", label: "학급 유아 수", placeholder: "예: 10" },
  { key: "region", label: "기관 소재 지역", placeholder: "예: 서울특별시 마포구" },
];

const TOTAL = ALL_ITEM_IDS.length;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function Shell({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{READING_ATTITUDE_TITLE}</h1>
          {label && <p className="mt-1 text-sm text-gray-500">{label}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}

function MessageCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm leading-relaxed text-gray-600 shadow-sm">
      {children}
    </div>
  );
}

export default function ReadingAttitudeSurvey({ classCode }: { classCode: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [loadError, setLoadError] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [childNo, setChildNo] = useState<number | null>(null);
  const [info, setInfo] = useState<Info>(EMPTY_INFO);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showMissing, setShowMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async (): Promise<Progress> => {
    const webhookUrl = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("config");
    const res = await fetch(
      `${webhookUrl}?action=progress&code=${encodeURIComponent(classCode)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!data || data.ok !== true) throw new Error(data?.error || "failed");
    return {
      label: String(data.label ?? ""),
      size: Number(data.size),
      done: ((data.done ?? []) as unknown[]).map((n) => Number(n)),
    };
  }, [classCode]);

  useEffect(() => {
    if (!classCode) {
      setLoadError("올바른 링크로 접속해 주세요. (학급 코드가 없습니다)");
      setStage("invalid");
      return;
    }
    let cancelled = false;
    fetchProgress()
      .then((p) => {
        if (cancelled) return;
        setProgress(p);
        setStage("grid");
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(
          e.message === "unknown class"
            ? "유효하지 않은 링크입니다. 전달받은 링크를 다시 확인해 주세요."
            : "진행 현황을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요."
        );
        setStage("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [classCode, fetchProgress]);

  const doneSet = new Set(progress?.done ?? []);
  const doneCount = doneSet.size;
  const allDone = progress ? doneCount >= progress.size : false;

  const answeredCount = ALL_ITEM_IDS.filter((id) => answers[id] !== undefined).length;
  const pct = Math.round((answeredCount / TOTAL) * 100);

  async function refreshProgress() {
    setRefreshing(true);
    try {
      setProgress(await fetchProgress());
    } catch {
      // 새로고침 실패 시 기존 표시를 유지한다.
    } finally {
      setRefreshing(false);
    }
  }

  function openChild(no: number) {
    setChildNo(no);
    setAnswers({});
    setShowMissing(false);
    setError(null);
    setStage("form");
    window.scrollTo({ top: 0 });
  }

  function backToGrid() {
    setChildNo(null);
    setAnswers({});
    setShowMissing(false);
    setError(null);
    setStage("grid");
    window.scrollTo({ top: 0 });
    void refreshProgress();
  }

  async function handleSubmit() {
    if (childNo === null || !progress) return;
    setError(null);

    const missInfo = (Object.keys(EMPTY_INFO) as (keyof Info)[]).filter(
      (k) => info[k].trim().length === 0
    );
    const missItems = ALL_ITEM_IDS.filter((id) => answers[id] === undefined);
    if (missInfo.length > 0 || missItems.length > 0) {
      setShowMissing(true);
      setError(
        `입력하지 않은 항목이 있습니다. (기본 정보 ${missInfo.length}개, 문항 ${missItems.length}개)`
      );
      scrollToId(missInfo.length > 0 ? `info-${missInfo[0]}` : `item-${missItems[0]}`);
      return;
    }

    const webhookUrl = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL;
    if (!webhookUrl) {
      setError("제출 설정이 되어 있지 않습니다. 관리자에게 문의해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      // 다른 기기에서 이미 제출된 번호인지 먼저 확인한다.
      const latest = await fetchProgress().catch(() => null);
      if (latest) {
        setProgress(latest);
        if (latest.done.includes(childNo)) {
          setError(`${childNo}번은 이미 제출되었습니다. 번호 선택 화면에서 다른 번호를 선택해 주세요.`);
          return;
        }
      }

      const payload = {
        survey: "reading-attitude",
        classCode,
        childNo,
        submittedAt: new Date().toISOString(),
        info: {
          institution: info.institution.trim(),
          evalDate: info.evalDate.trim(),
          childAge: info.childAge.trim(),
          classSize: info.classSize.trim(),
          region: info.region.trim(),
        },
        answers,
      };
      // Apps Script 웹앱 응답은 읽을 수 없는 no-cors 방식으로 전송하고,
      // 저장 여부는 아래에서 진행 현황을 다시 조회해 확인한다.
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      for (let attempt = 0; attempt < 6; attempt++) {
        await sleep(1500);
        const p = await fetchProgress().catch(() => null);
        if (p && p.done.includes(childNo)) {
          setProgress(p);
          setStage("done");
          window.scrollTo({ top: 0 });
          return;
        }
      }
      setError(
        "저장이 확인되지 않았습니다. 잠시 후 번호 선택 화면에서 해당 번호가 완료로 표시되는지 확인하고, 완료로 보이지 않으면 다시 제출해 주세요."
      );
    } catch {
      setError("제출 중 문제가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- 화면 ----------

  if (stage === "loading") {
    return (
      <Shell>
        <MessageCard>불러오는 중입니다...</MessageCard>
      </Shell>
    );
  }

  if (stage === "invalid") {
    return (
      <Shell>
        <MessageCard>
          <p className="mb-4">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            다시 시도
          </button>
        </MessageCard>
      </Shell>
    );
  }

  if (!progress) return null;

  if (stage === "grid") {
    const gridPct = Math.round((doneCount / progress.size) * 100);
    return (
      <Shell label={progress.label}>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-1 flex items-end justify-between">
            <h2 className="text-base font-semibold text-gray-900">유아 번호 선택</h2>
            <span className="text-sm font-semibold text-brand-600">
              {doneCount} / {progress.size} 완료
            </span>
          </div>
          <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-brand-500 transition-all duration-300 ease-out"
              style={{ width: `${gridPct}%` }}
            />
          </div>

          {allDone ? (
            <p className="mb-5 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
              모든 유아의 응답이 완료되었습니다. 참여해 주셔서 감사합니다.
            </p>
          ) : (
            <p className="mb-5 text-sm leading-relaxed text-gray-600">
              응답할 유아의 번호를 선택해 주세요. 번호와 유아의 대응은 선생님께서 따로 기록해 두시고,
              같은 번호는 한 번만 응답할 수 있습니다.
            </p>
          )}

          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: progress.size }, (_, i) => i + 1).map((no) => {
              const isDone = doneSet.has(no);
              return (
                <button
                  key={no}
                  type="button"
                  disabled={isDone}
                  onClick={() => openChild(no)}
                  aria-label={isDone ? `${no}번 완료` : `${no}번 응답하기`}
                  className={[
                    "flex aspect-square flex-col items-center justify-center rounded-lg border-2 text-sm font-bold transition",
                    isDone
                      ? "cursor-default border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700",
                  ].join(" ")}
                >
                  <span>{no}</span>
                  {isDone && <span className="text-[10px] font-semibold leading-none">✓ 완료</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => void refreshProgress()}
              disabled={refreshing}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              {refreshing ? "확인 중..." : "진행 현황 새로고침"}
            </button>
          </div>
        </section>
      </Shell>
    );
  }

  if (stage === "done") {
    return (
      <Shell label={progress.label}>
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-600">
            ✓
          </div>
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            {childNo}번 유아의 제출이 완료되었습니다
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            {allDone
              ? `모든 유아(${progress.size}명)의 응답이 완료되었습니다. 감사합니다.`
              : `${doneCount} / ${progress.size} 완료`}
          </p>
          <button
            type="button"
            onClick={backToGrid}
            className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            {allDone ? "진행 현황 보기" : "다음 유아 선택하기"}
          </button>
        </div>
      </Shell>
    );
  }

  // stage === "form"
  const inputClass = (key: keyof Info) =>
    [
      "w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2",
      showMissing && info[key].trim().length === 0
        ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100"
        : "border-gray-300 focus:border-brand-500 focus:ring-brand-100",
    ].join(" ");

  return (
    <Shell label={progress.label}>
      <div className="sticky top-0 z-20 -mx-4 mb-6 bg-[#f4f6fb]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            onClick={backToGrid}
            className="font-semibold text-brand-600 hover:underline"
          >
            ← 번호 선택으로
          </button>
          <span>
            {childNo}번 유아 · 응답 {answeredCount} / {TOTAL} ({pct}%)
          </span>
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
          {INFO_FIELDS.map((f) => (
            <div
              key={f.key}
              id={`info-${f.key}`}
              className={[
                "flex flex-col gap-1.5",
                f.key === "institution" ? "sm:col-span-2" : "",
              ].join(" ")}
            >
              <label htmlFor={f.key} className="text-sm font-medium text-gray-700">
                {f.label}
              </label>
              <input
                id={f.key}
                type="text"
                value={info[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })}
                className={inputClass(f.key)}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">유아 명렬 번호</span>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-900">
              {childNo}번
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
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mb-10 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
        >
          {submitting ? "제출 중..." : `${childNo}번 유아 제출하기`}
        </button>
      </div>
    </Shell>
  );
}
