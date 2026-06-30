import withAuthMiddleware from "next-auth/middleware";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  return withAuthMiddleware(request as never);
}

export const config = {
  matcher: [
    "/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
