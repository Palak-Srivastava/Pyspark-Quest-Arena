import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "alive",
      timestamp: new Date().toISOString(),
      service: "spark-practice-arena",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
