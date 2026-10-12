/**
 * ELLCO Pre-K 설문 결과를 구글 시트에 저장하는 Apps Script.
 *
 * 설치 방법:
 * 1) 구글 스프레드시트를 새로 만든다 (또는 기존 시트 사용).
 * 2) 시트 메뉴 [확장 프로그램] > [Apps Script] 를 연다.
 * 3) 아래 코드를 전부 붙여넣고 저장한다.
 * 4) [배포] > [새 배포] > 유형: "웹앱" 선택.
 *    - 실행 계정: 나 (본인 구글 계정)
 *    - 액세스 권한: 전체 공개 (Anyone) — Vercel 서버가 호출할 수 있어야 함
 * 5) 배포 후 나오는 "웹 앱 URL"을 복사한다.
 * 6) Vercel 프로젝트의 환경변수 NEXT_PUBLIC_GAS_WEBHOOK_URL 에 그 URL을 붙여넣는다.
 *    (브라우저에서 직접 호출하므로 반드시 NEXT_PUBLIC_ 접두사가 붙어야 한다.)
 *
 * 주의: 이 스크립트가 시트 메뉴 [확장 프로그램] > [Apps Script]가 아니라
 * script.google.com에서 독립 프로젝트로 만들어졌다면 SpreadsheetApp.getActiveSpreadsheet()가
 * 어떤 시트인지 알 수 없어 실패한다. 아래 SPREADSHEET_ID에 저장할 시트의 ID를 직접 넣어
 * 어떤 방식으로 만들어졌든 항상 그 시트를 찾도록 한다.
 * (시트 URL 예: https://docs.google.com/spreadsheets/d/이 부분이 ID/edit)
 */

const SPREADSHEET_ID = "1fM2LvNVz9_uWA3oI2wMfDVEYvYNYYlLCHW7nFA98M9g";

// 김명화 "유아 책 읽기태도 질문지" 전용 탭 (survey: "reading-attitude" 요청만 이 탭에 저장)
const READING_ATTITUDE_SHEET = "김명화_책읽기태도";
const READING_ATTITUDE_TEST_SHEET = "_TEST_책읽기태도";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = JSON.parse(e.postData.contents);

    // 신규 검사도구: 기존 ELLCO 로직을 거치지 않고 전용 탭에만 저장한다.
    if (data && data.survey === "reading-attitude") {
      return saveReadingAttitude_(data, READING_ATTITUDE_SHEET);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("응답") || ss.insertSheet("응답");

    const introKeys = [
      "teacherName",
      "evalDate",
      "institutionName",
      "institutionType",
      "teacherCount",
      "otherAdultCount",
      "girlsCount",
      "boysCount",
      "classAge",
      "disabledCount",
      "multiculturalCount",
    ];

    const introLabels = [
      "교사명",
      "평가일",
      "기관명",
      "기관유형",
      "교실 내 교사 수",
      "교실 내 교사 이외 성인 수",
      "여아수",
      "남아수",
      "담당학급연령",
      "장애 유아 수",
      "다문화 유아 수",
    ];

    if (sheet.getLastRow() === 0) {
      const header = ["제출시각", ...introLabels];
      const questionCount = (data.answers || []).length;
      for (let i = 0; i < questionCount; i++) {
        header.push((data.answers[i].no || i + 1) + "번");
      }
      sheet.appendRow(header);
    }

    const row = [data.submittedAt || new Date().toISOString()];
    introKeys.forEach((k) => row.push((data.intro && data.intro[k]) || ""));
    (data.answers || []).forEach((a) => row.push(a.score));

    sheet.appendRow(row);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// 김명화 "유아 책 읽기태도 질문지" 저장
// 열: 제출 일시 | 기관명 | 검사일 | 성별 | 생년월일 | I_1~I_6 | II_1~II_6 | III_1~III_6
//     | consent_future_use | consent_version  (동의 정보는 맨 끝 2열)
// ---------------------------------------------------------------------------

const READING_ATTITUDE_ITEM_IDS = [
  "I_1", "I_2", "I_3", "I_4", "I_5", "I_6",
  "II_1", "II_2", "II_3", "II_4", "II_5", "II_6",
  "III_1", "III_2", "III_3", "III_4", "III_5", "III_6",
];

function saveReadingAttitude_(data, sheetName) {
  const info = data.info || {};
  const answers = data.answers || {};

  // 18문항 모두 1~5 정수여야 저장한다 (잘못된 요청이 시트에 섞이지 않도록).
  const scores = READING_ATTITUDE_ITEM_IDS.map(function (id) {
    const n = Number(answers[id]);
    if (!(n >= 1 && n <= 5 && Math.floor(n) === n)) {
      throw new Error("Invalid answer for " + id);
    }
    return n;
  });

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(
      ["제출 일시", "기관명", "검사일", "성별", "생년월일"]
        .concat(READING_ATTITUDE_ITEM_IDS)
        .concat(["consent_future_use", "consent_version"])
    );
  }

  const text = function (v) {
    return String(v === undefined || v === null ? "" : v).trim().slice(0, 200);
  };

  const consent = data.consent || {};
  const consentFutureUse =
    consent.futureUse === true ? "agree" : consent.futureUse === false ? "disagree" : "";

  const row = [
    Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
    text(info.institution),
    text(info.testDate),
    text(info.gender),
    text(info.birthDate),
  ]
    .concat(scores)
    .concat([consentFutureUse, text(consent.version)]);

  // 문자열 칸(기관명~생년월일, 동의 정보)은 "일반 텍스트"로 먼저 지정해, 입력값이 수식(=, + 등)으로
  // 해석되거나 날짜 서식이 자동 변환되지 않고 입력한 그대로 저장되게 한다.
  const targetRow = sheet.getLastRow() + 1;
  const firstConsentCol = 5 + READING_ATTITUDE_ITEM_IDS.length + 1;
  sheet.getRange(targetRow, 2, 1, 4).setNumberFormat("@");
  sheet.getRange(targetRow, firstConsentCol, 1, 2).setNumberFormat("@");
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ---------------------------------------------------------------------------
// 테스트용 (Apps Script 편집기에서 직접 실행. 웹앱 URL로는 호출되지 않음)
// 실제 데이터 탭이 아닌 "_TEST_책읽기태도" 탭에만 기록하며, 확인 후 아래 cleanup 함수로 삭제한다.
// ---------------------------------------------------------------------------

function testReadingAttitude_() {
  const answers = {};
  READING_ATTITUDE_ITEM_IDS.forEach(function (id, i) {
    answers[id] = (i % 5) + 1;
  });
  const out = saveReadingAttitude_(
    {
      survey: "reading-attitude",
      consent: { agreed: true, futureUse: true, version: "test" },
      info: { institution: "테스트기관", testDate: "2026-01-01", gender: "남", birthDate: "2021-01-01" },
      answers: answers,
    },
    READING_ATTITUDE_TEST_SHEET
  );
  Logger.log(out.getContent());
}

function cleanupReadingAttitudeTest_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(READING_ATTITUDE_TEST_SHEET);
  if (sheet) ss.deleteSheet(sheet);
}
