import { NextResponse, type NextRequest } from "next/server";

import { DEMO_COOKIE } from "@/lib/auth/demo";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const demoRole = request.cookies.get(DEMO_COOKIE)?.value;
  if (demoRole === "participant" || demoRole === "organization") {
    return NextResponse.next({ request });
  }

  return updateSession(request);
}

export const proxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
