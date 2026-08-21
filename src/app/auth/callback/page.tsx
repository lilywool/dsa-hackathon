import { Suspense } from "react";

import { AuthCallbackClient } from "@/app/auth/callback/auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full items-center justify-center px-6">
          <p className="text-muted-foreground">Confirming your email…</p>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
