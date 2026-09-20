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
 * 6) Vercel 프로젝트의 환경변수 GAS_WEBHOOK_URL 에 그 URL을 붙여넣는다.
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
