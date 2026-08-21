"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

function safePath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

function fallbackForNext(next: string | null) {
  if (next?.startsWith("/participant")) {
    return "/participant/sign-in?expired=1";
  }
  return "/organization/sign-in?expired=1";
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const next = safePath(searchParams.get("next"));
      const authError = searchParams.get("error");
      const errorCode = searchParams.get("error_code");

      if (authError || errorCode === "otp_expired") {
        router.replace(fallbackForNext(next));
        return;
      }

      const supabase = createClient();
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (error) {
          setMessage("That confirmation link is invalid or has expired.");
          router.replace(fallbackForNext(next));
          return;
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage("That confirmation link is invalid or has expired.");
          router.replace(fallbackForNext(next));
          return;
        }
      } else {
        await supabase.auth.getSession();
      }

      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) {
        return;
      }

      if (!userData.user) {
        router.replace(fallbackForNext(next));
        return;
      }

      if (next === "/auth/update-password") {
        router.replace(next);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, org_id")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profile?.role === "organization" && profile.org_id) {
        router.replace("/organization");
        return;
      }

      if (
        profile?.role === "pending_organization" ||
        profile?.role === "organization"
      ) {
        router.replace("/organization/status");
        return;
      }

      if (profile?.role === "participant") {
        router.replace(next?.startsWith("/participant") ? next : "/participant");
        return;
      }

      router.replace(next ?? "/");
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-full items-center justify-center px-6">
      <p className="text-muted-foreground">{message}</p>
    </main>
  );
}
