import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATHS = new Set(["/", "/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);

  if (hasToken && PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!hasToken && !PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|fonts|oauth/kakao/callback).*)",
  ],
};
