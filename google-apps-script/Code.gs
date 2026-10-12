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
// 김명화 "유아 책 읽기태도 질문지"
//
// 학급 코드(?c=코드)로 접속 → "학급" 탭에서 표시이름·유아 수를 읽고, 유아 번호별 완료 여부를 관리한다.
// 개인정보(이름·생년월일)는 받지 않고 유아 번호(1~유아 수)만 저장한다.
//
// 응답 탭 열: 제출 일시 | 학급코드 | 학급(표시이름) | 소속 기관명 | 평가일 | 담당 유아 연령 | 학급 유아 수
//             | 기관 소재 지역 | 유아 명렬 번호 | I_1~I_6 | II_1~II_6 | III_1~III_6
// ---------------------------------------------------------------------------

const READING_ATTITUDE_ROSTER_SHEET = "학급";

const READING_ATTITUDE_ITEM_IDS = [
  "I_1", "I_2", "I_3", "I_4", "I_5", "I_6",
  "II_1", "II_2", "II_3", "II_4", "II_5", "II_6",
  "III_1", "III_2", "III_3", "III_4", "III_5", "III_6",
];

const READING_ATTITUDE_HEADER = [
  "제출 일시", "학급코드", "학급(표시이름)", "소속 기관명", "평가일", "담당 유아 연령", "학급 유아 수",
  "기관 소재 지역", "유아 명렬 번호",
].concat(READING_ATTITUDE_ITEM_IDS);

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// 진행도 조회: GET ...?action=progress&code=학급코드 → { ok, label, size, done: [완료된 유아 번호들] }
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "progress") {
    // 파라미터 이름 "c"는 값이 영문일 때 구글이 400으로 막으므로 "code"를 쓴다.
    const code = String(p.code || "").trim();
    const cls = readingAttitudeFindClass_(code);
    if (!cls) return jsonOut_({ ok: false, error: "unknown class" });
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(READING_ATTITUDE_SHEET);
    return jsonOut_({
      ok: true,
      label: cls.label,
      size: cls.size,
      done: readingAttitudeDoneNumbers_(sheet, code),
    });
  }
  return jsonOut_({ ok: false, error: "unknown action" });
}

function readingAttitudeFindClass_(code) {
  if (!code) return null;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(READING_ATTITUDE_ROSTER_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === code) {
      const size = Number(rows[i][2]);
      if (!(size >= 1 && Math.floor(size) === size)) return null;
      return { code: code, label: String(rows[i][1]), size: size };
    }
  }
  return null;
}

// 응답 탭에서 해당 학급코드(B열)의 유아 명렬 번호(I열) 목록
function readingAttitudeDoneNumbers_(sheet, code) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 2, sheet.getLastRow() - 1, 8).getValues();
  const out = [];
  rows.forEach(function (r) {
    if (String(r[0]) === code) {
      const n = Number(r[7]);
      if (n >= 1 && out.indexOf(n) === -1) out.push(n);
    }
  });
  return out;
}

function saveReadingAttitude_(data, sheetName) {
  const info = data.info || {};
  const answers = data.answers || {};

  const classCode = String(data.classCode || "").trim();
  const cls = readingAttitudeFindClass_(classCode);
  if (!cls) throw new Error("Unknown class code");

  const childNo = Number(data.childNo);
  if (!(childNo >= 1 && childNo <= cls.size && Math.floor(childNo) === childNo)) {
    throw new Error("Invalid child number");
  }

  // 18문항 모두 1~5 정수여야 저장한다 (잘못된 요청이 시트에 섞이지 않도록).
  const scores = READING_ATTITUDE_ITEM_IDS.map(function (id) {
    const n = Number(answers[id]);
    if (!(n >= 1 && n <= 5 && Math.floor(n) === n)) {
      throw new Error("Invalid answer for " + id);
    }
    return n;
  });

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);

  // 이전 열 구성의 탭이 이미 있으면 데이터를 보존하기 위해 이름만 바꿔 두고 새 탭을 만든다.
  if (sheet && sheet.getLastRow() > 0) {
    const current = sheet.getRange(1, 1, 1, READING_ATTITUDE_HEADER.length).getValues()[0];
    const same = READING_ATTITUDE_HEADER.every(function (h, i) {
      return String(current[i]) === h;
    });
    if (!same) {
      sheet.setName(
        sheetName + "_구버전_" + Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmmss")
      );
      sheet = null;
    }
  }
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(READING_ATTITUDE_HEADER);

  // 같은 학급의 같은 번호가 이미 있으면 다시 저장하지 않는다 (중복 제출 방지).
  if (readingAttitudeDoneNumbers_(sheet, classCode).indexOf(childNo) !== -1) {
    return jsonOut_({ ok: true, duplicate: true });
  }

  const text = function (v) {
    return String(v === undefined || v === null ? "" : v).trim().slice(0, 200);
  };

  const row = [
    Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
    classCode,
    cls.label,
    text(info.institution),
    text(info.evalDate),
    text(info.childAge),
    text(info.classSize),
    text(info.region),
    childNo,
  ].concat(scores);

  // 문자열 칸(학급코드~기관 소재 지역: B~H열)은 "일반 텍스트"로 먼저 지정해, 입력값이 수식(=, + 등)으로
  // 해석되거나 날짜 서식이 자동 변환되지 않고 입력한 그대로 저장되게 한다.
  const targetRow = sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 2, 1, 7).setNumberFormat("@");
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);

  return jsonOut_({ ok: true });
}

// ---------------------------------------------------------------------------
// 학급 목록 탭 만들기 (편집기에서 1회 실행). 이미 "학급" 탭이 있으면 아무것도 하지 않는다.
// 코드는 무작위로 생성되며, "링크" 열의 주소를 선생님께 전달한다.
// 선생님을 추가하려면 "학급" 탭에 한 줄 추가: 코드(아무 영문/숫자 10자 내외) | 표시이름 | 유아 수
// ---------------------------------------------------------------------------
function setupReadingAttitudeRoster() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (ss.getSheetByName(READING_ATTITUDE_ROSTER_SHEET)) {
    Logger.log("'학급' 탭이 이미 있어 아무것도 하지 않았습니다.");
    return;
  }
  const sheet = ss.insertSheet(READING_ATTITUDE_ROSTER_SHEET);
  sheet.appendRow(["코드", "표시이름", "유아 수", "완료 수", "링크"]);

  const base = "https://concurrent-validity.vercel.app/survey-2?c=";
  [["이주은 선생님", 10], ["최민선 선생님", 19]].forEach(function (c) {
    const code = Utilities.getUuid().replace(/-/g, "").slice(0, 10);
    const r = sheet.getLastRow() + 1;
    sheet.getRange(r, 1).setNumberFormat("@").setValue(code);
    sheet.getRange(r, 2).setValue(c[0]);
    sheet.getRange(r, 3).setValue(c[1]);
    sheet
      .getRange(r, 4)
      .setFormula("=COUNTIF(INDIRECT(\"'" + READING_ATTITUDE_SHEET + "'!B:B\"),A" + r + ")");
    sheet.getRange(r, 5).setFormula('="' + base + '"&A' + r);
  });
}

// ---------------------------------------------------------------------------
// 테스트용 (Apps Script 편집기에서 직접 실행. 웹앱 URL로는 호출되지 않음)
// 실제 데이터 탭이 아닌 "_TEST_책읽기태도" 탭에만 기록하며, 확인 후 cleanup 함수로 삭제한다.
// 먼저 setupReadingAttitudeRoster()로 "학급" 탭이 있어야 한다.
// ---------------------------------------------------------------------------

function testReadingAttitude_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const roster = ss.getSheetByName(READING_ATTITUDE_ROSTER_SHEET);
  if (!roster || roster.getLastRow() < 2) {
    throw new Error("'학급' 탭이 없습니다. 먼저 setupReadingAttitudeRoster를 실행하세요.");
  }
  const code = String(roster.getRange(2, 1).getValue()).trim();

  const answers = {};
  READING_ATTITUDE_ITEM_IDS.forEach(function (id, i) {
    answers[id] = (i % 5) + 1;
  });
  const out = saveReadingAttitude_(
    {
      survey: "reading-attitude",
      classCode: code,
      childNo: 1,
      info: {
        institution: "테스트기관",
        evalDate: "2026-01-01",
        childAge: "만 4세",
        classSize: "10",
        region: "테스트지역",
      },
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

// 편집기의 실행 목록에는 이름이 _로 끝나는 함수가 보이지 않으므로, 실행용 이름을 따로 둔다.
function testReadingAttitude() {
  testReadingAttitude_();
}

function cleanupReadingAttitudeTest() {
  cleanupReadingAttitudeTest_();
}
