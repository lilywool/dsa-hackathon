import { redirect } from "next/navigation";

import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { ParticipantSignInForm } from "@/components/auth/participant-forms";
import { getProfile } from "@/lib/auth/session";

export const metadata = {
  title: "Participant sign in",
};

export default async function ParticipantSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ "check-email"?: string; expired?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();

  if (profile?.role === "participant") {
    redirect("/participant");
  }

  return (
    <AuthFrame
      title="Sign in as a participant"
      description="Use the email and password you created. This opens the help-finding dashboard."
    >
      {params.expired ? (
        <p className="mb-4 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
          That email link expired. Sign in here, or reset your password if you
          need a new one.
        </p>
      ) : null}
      {params["check-email"] ? (
        <p className="mb-4 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
          Check your email to confirm the account, then sign in here.
        </p>
      ) : null}
      <ParticipantSignInForm />
      <AuthLinks>
        New here? <TextLink href="/participant/sign-up">Create an account</TextLink>
        <span className="mx-2">·</span>
        <TextLink href="/auth/forgot-password">Forgot password?</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
