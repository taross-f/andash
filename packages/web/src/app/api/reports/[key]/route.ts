import { NextRequest, NextResponse } from "next/server";

interface Env {
  REPORTS: R2Bucket;
}

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    // In Cloudflare Pages, R2 binding would be available
    // @ts-expect-error - R2 binding from Cloudflare
    const REPORTS = process.env.REPORTS as R2Bucket;

    if (!REPORTS) {
      return NextResponse.json(
        { error: "R2 storage not configured" },
        { status: 500 }
      );
    }

    const object = await REPORTS.get(key);

    if (!object) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "text/markdown");
    headers.set("Content-Disposition", `attachment; filename="${key}"`);

    return new NextResponse(object.body, {
      headers,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
