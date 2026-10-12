"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONSENT, type ConsentBlock } from "@/data/readingAttitudeConsent";

type Choice = "agree" | "disagree" | null;

function BlockBody({ block }: { block: ConsentBlock }) {
  return (
    <>
      {(block.paragraphs ?? []).map((p, i) => (
        <p key={`p${i}`} className="mb-3 text-sm leading-relaxed text-gray-700">
          {p}
        </p>
      ))}
      {block.bullets && (
        <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
          {block.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {(block.after ?? []).map((p, i) => (
        <p key={`a${i}`} className="mb-3 text-sm leading-relaxed text-gray-700">
          {p}
        </p>
      ))}
    </>
  );
}

function ChoiceGroup({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Choice;
  onChange: (v: Exclude<Choice, null>) => void;
}) {
  const options: [Exclude<Choice, null>, string][] = [
    ["agree", "동의합니다"],
    ["disagree", "동의하지 않습니다"],
  ];
  return (
    <div role="radiogroup" className="mb-4 mt-1 flex flex-wrap gap-x-6 gap-y-2">
      {options.map(([v, label]) => (
        <label
          key={v}
          className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 text-[15px] text-gray-800"
        >
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className="h-5 w-5 accent-[#3366ff]"
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

export function ConsentScreen({
  onAgree,
  onDecline,
}: {
  onAgree: () => void;
  onDecline: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [participation, setParticipation] = useState<Choice>(null);
  const [futureUse, setFutureUse] = useState<Choice>(null);

  const checkEnd = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    setReachedEnd(box.scrollTop + box.clientHeight >= box.scrollHeight - 8);
  }, []);

  useEffect(() => {
    checkEnd();
    window.addEventListener("resize", checkEnd);
    return () => window.removeEventListener("resize", checkEnd);
  }, [checkEnd]);

  const answered = participation !== null && futureUse !== null;
  const canProceed = reachedEnd && answered;

  function handleNext() {
    if (!canProceed) return;
    if (participation === "agree" && futureUse === "agree") onAgree();
    else onDecline();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{CONSENT.title}</h2>

      <div
        ref={boxRef}
        tabIndex={0}
        onScroll={checkEnd}
        className="mb-4 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4"
        style={{ wordBreak: "keep-all" }}
      >
        <dl className="mb-3 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm">
          {CONSENT.info.map(([k, v], i) => (
            <div key={k} className={i === 0 ? "" : "mt-1.5"}>
              <dt className="font-bold text-gray-700">{k}</dt>
              <dd className="mt-0.5 text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mb-3 text-xs leading-relaxed text-gray-400">{CONSENT.note}</p>

        {CONSENT.sections.map((section) => (
          <div key={section.heading}>
            <h3 className="mb-2 mt-5 text-[15px] font-bold text-gray-900">{section.heading}</h3>
            <BlockBody block={section} />
            {(section.subsections ?? []).map((sub) => (
              <div key={sub.heading}>
                <h4 className="mb-1.5 mt-3.5 text-sm font-bold text-gray-800">{sub.heading}</h4>
                <BlockBody block={sub} />
              </div>
            ))}
          </div>
        ))}

        <h3 className="mb-2 mt-5 text-[15px] font-bold text-gray-900">{CONSENT.agreementTitle}</h3>
        <p className="mb-3 text-sm leading-relaxed text-gray-700">{CONSENT.agreementIntro}</p>
        <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
          {CONSENT.agreementItems.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
        <p className="mb-1 mt-2 text-sm font-bold leading-relaxed text-gray-900">
          {CONSENT.participationStatement}
        </p>
        <ChoiceGroup name="consent-participation" value={participation} onChange={setParticipation} />

        <h4 className="mb-1.5 mt-3.5 text-sm font-bold text-gray-800">{CONSENT.futureUseTitle}</h4>
        <p className="mb-1 mt-2 text-sm font-bold leading-relaxed text-gray-900">
          {CONSENT.futureUseStatement}
        </p>
        <ChoiceGroup name="consent-futureUse" value={futureUse} onChange={setFutureUse} />
      </div>

      {!(reachedEnd && answered) && (
        <p className="mb-3 text-center text-[13px] text-gray-500">
          내용을 끝까지 읽고 두 항목에 모두 응답하면 ‘다음으로’ 버튼이 활성화됩니다.
        </p>
      )}

      <button
        type="button"
        onClick={handleNext}
        disabled={!canProceed}
        className="w-full rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        다음으로
      </button>
      <p className="mt-2.5 text-center text-[13px] text-gray-500">
        두 항목 중 하나라도 동의하지 않으실 경우 설문이 종료됩니다.
      </p>
    </div>
  );
}

export function ConsentEnded() {
  const [showNote, setShowNote] = useState(false);

  function handleExit() {
    window.close();
    // 직접 연 창이 아니면 브라우저가 닫기를 막으므로, 그 경우 안내 문구를 보여준다.
    setTimeout(() => setShowNote(true), 300);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div>
        <p className="mb-6 text-base leading-relaxed text-gray-800">
          동의하지 않으셨습니다.
          <br />
          설문이 종료되었습니다.
          <br />
          참여해 주셔서 감사합니다.
        </p>
        <button
          type="button"
          onClick={handleExit}
          className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          종료하기
        </button>
        {showNote && (
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            브라우저 보안 정책으로 창을 자동으로 닫을 수 없습니다. 이 창(탭)을 직접 닫아 주세요.
          </p>
        )}
      </div>
    </div>
  );
}
