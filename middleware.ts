import { type NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/login", "/public", "/"];
const SESSION_COOKIE = "session_token";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic =
    pathname === "/" ||
    publicRoutes.some((route) => route !== "/" && pathname.startsWith(route));
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (!hasSession && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/public/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
