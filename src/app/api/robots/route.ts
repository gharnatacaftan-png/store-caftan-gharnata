import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    const robots = `User-agent: *
Allow: /

# Admin panel - disallow
Disallow: /gharnata-portal-x92/

# API routes - disallow
Disallow: /api/

# Sitemap
Sitemap: https://caftan-granada.com/sitemap.xml
`;

    return new NextResponse(robots, {
        headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400",
        },
    });
}