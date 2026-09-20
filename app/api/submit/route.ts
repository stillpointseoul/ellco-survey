import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.GAS_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "GAS_WEBHOOK_URL 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google Sheets 저장 실패 (status ${res.status}): ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }

    // Apps Script sometimes returns an HTML login/permission page instead of
    // JSON when the deployment's access is not set to "Anyone".
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error:
            "Google Apps Script가 JSON이 아닌 응답을 반환했습니다. 배포 설정에서 '액세스 권한'이 '전체 공개(Anyone)'로 되어 있는지 확인해주세요. (응답 일부: " +
            text.slice(0, 200) +
            ")",
        },
        { status: 502 }
      );
    }

    if (parsed && parsed.ok === false) {
      return NextResponse.json(
        { error: `Apps Script 오류: ${parsed.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
