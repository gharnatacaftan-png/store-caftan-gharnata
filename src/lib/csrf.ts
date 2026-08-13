import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual as nodeTimingSafeEqual } from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

export function generateCsrfToken(): string {
    return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

export function hashCsrfToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export async function setCsrfTokenCookie(): Promise<string> {
    const token = generateCsrfToken();
    const hashed = hashCsrfToken(token);
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, hashed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 4, // 4 hours
    });
    return token;
}

export async function getCsrfTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
    // Get token from header
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    if (!headerToken) return false;

    // Get hashed token from cookie
    const cookieToken = await getCsrfTokenFromCookie();
    if (!cookieToken) return false;

    // Compare hashed header token with cookie token
    const hashedHeaderToken = hashCsrfToken(headerToken);
    return timingSafeEqual(hashedHeaderToken, cookieToken);
}

// Version that works with standard Request or headers object
export async function validateCsrfTokenFromHeaders(headers: Headers): Promise<boolean> {
    // Get token from header
    const headerToken = headers.get(CSRF_HEADER_NAME);
    if (!headerToken) return false;

    // Get hashed token from cookie
    const cookieToken = await getCsrfTokenFromCookie();
    if (!cookieToken) return false;

    // Compare hashed header token with cookie token
    const hashedHeaderToken = hashCsrfToken(headerToken);
    return timingSafeEqual(hashedHeaderToken, cookieToken);
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return nodeTimingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function csrfProtection() {
    return async (request: NextRequest) => {
        const isValid = await validateCsrfToken(request);
        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid CSRF token" },
                { status: 403 }
            );
        }
        return null;
    };
}