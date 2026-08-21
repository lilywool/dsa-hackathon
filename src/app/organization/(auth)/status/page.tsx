import { redirect } from "next/navigation";

import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { OrganizationStatusForm } from "@/components/auth/organization-forms";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { isDemoProfile } from "@/lib/auth/demo";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Application status",
};

export default async function OrganizationStatusPage() {
  const profile = await getProfile();

  if (profile && isDemoProfile(profile)) {
    redirect(profile.role === "participant" ? "/participant" : "/organization");
  }

  if (!profile || profile.role === "participant") {
    return (
      <AuthFrame
        title="Check your application"
        description="Use the same email and password you submitted. If you were approved, your organization ID will be here."
      >
        <OrganizationStatusForm />
        <AuthLinks>
          <TextLink href="/organization/apply">Submit an application</TextLink>
          <span className="mx-2">·</span>
          <TextLink href="/organization/sign-in">Sign in</TextLink>
        </AuthLinks>
      </AuthFrame>
    );
  }

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (application?.status === "approved" && application.org_id) {
    return (
      <AuthFrame
        title="You were approved"
        description="Your organization ID is below. You can open the dashboard with the same email and password you applied with."
      >
        <p className="rounded-2xl bg-card px-5 py-6 text-center ring-1 ring-foreground/10">
          <span className="text-sm text-muted-foreground">Organization ID</span>
          <span className="font-heading mt-2 block text-3xl tracking-wide">
            {application.org_id}
          </span>
        </p>
        <Button className="mt-6 h-11 w-full" asChild>
          <a href="/organization">Open dashboard</a>
        </Button>
        <AuthLinks>
          <form action={signOut}>
            <button type="submit" className="underline-offset-4 hover:underline">
              Sign out
            </button>
          </form>
        </AuthLinks>
      </AuthFrame>
    );
  }

  if (application?.status === "denied") {
    return (
      <AuthFrame
        title="This application was not approved"
        description="This application was not approved. You can reach out if you think that was a mistake."
      >
        <AuthLinks>
          <form action={signOut}>
            <button type="submit" className="underline-offset-4 hover:underline">
              Sign out
            </button>
          </form>
        </AuthLinks>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Still under review"
      description={`${application?.organization_name ?? "Your organization"} in ${application?.location ?? "your area"} is waiting on a decision. Come back here for your ID if you are approved.`}
    >
      <AuthLinks>
        <form action={signOut}>
          <button type="submit" className="underline-offset-4 hover:underline">
            Sign out
          </button>
        </form>
      </AuthLinks>
    </AuthFrame>
  );
}
