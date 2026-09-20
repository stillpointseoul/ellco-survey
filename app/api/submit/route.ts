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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Google Sheets 저장 실패: ${text}` },
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
