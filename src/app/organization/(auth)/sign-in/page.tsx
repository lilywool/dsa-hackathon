import { redirect } from "next/navigation";

import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { OrganizationSignInForm } from "@/components/auth/organization-forms";
import { getProfile } from "@/lib/auth/session";

export const metadata = {
  title: "Organization sign in",
};

export default async function OrganizationSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();

  if (profile?.role === "organization" && profile.org_id) {
    redirect("/organization/insights");
  }

  if (profile?.role === "pending_organization") {
    redirect("/organization/status");
  }

  return (
    <AuthFrame
      title="Sign in as an organization"
      description="Use the email and password from your application. If you were approved, this opens the dashboard."
    >
      {params.expired ? (
        <p className="mb-4 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
          That email link expired. Sign in here, or reset your password if the
          first one you set does not work.
        </p>
      ) : null}
      <OrganizationSignInForm />
      <AuthLinks>
        <TextLink href="/auth/forgot-password">Forgot password?</TextLink>
        <span className="mx-2">·</span>
        <TextLink href="/organization/apply">Submit an application</TextLink>
        <span className="mx-2">·</span>
        <TextLink href="/organization/status">Check status</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
