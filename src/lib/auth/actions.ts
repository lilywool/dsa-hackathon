"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEMO_COOKIE,
  DEMO_EMAIL_COOKIE,
  matchDemoAccount,
  type DemoRole,
} from "@/lib/auth/demo";
import { ORG_VERIFIED_COOKIE, REVIEW_COOKIE } from "@/lib/auth/session";
import {
  clearDemoRequestsCookie,
  clearLegacyDemoRequestsCookie,
} from "@/lib/help/demo-store";
import { SERVICE_KINDS } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { ServiceKind } from "@/lib/supabase/database.types";

export type AuthState = { error: string | null };

function asServiceKinds(values: string[]): ServiceKind[] {
  return values.filter((value): value is ServiceKind =>
    SERVICE_KINDS.includes(value as ServiceKind),
  );
}

function signInErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("confirm")) {
    return "That email or password did not match. Try the first password you set, or reset it.";
  }
  return "Must be approved SupaBase dev login account";
}

async function profileForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

async function siteUrl() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

async function setDemoRole(role: DemoRole | null, email?: string) {
  const cookieStore = await cookies();
  if (role) {
    cookieStore.set(DEMO_COOKIE, role, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 8,
    });
    cookieStore.set(DEMO_EMAIL_COOKIE, email ?? "", {
      ...cookieOptions(),
      maxAge: 60 * 60 * 8,
    });
    return;
  }

  cookieStore.delete(DEMO_COOKIE);
  cookieStore.delete(DEMO_EMAIL_COOKIE);
}

async function completeDemoSignIn(role: DemoRole, email: string): Promise<never> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Auth may be down; demo login should still open the dashboard.
  }

  await setDemoRole(role, email);
  await clearLegacyDemoRequestsCookie();
  redirect(role === "organization" ? "/organization/insights" : "/participant");
}

export async function signOut() {
  const cookieStore = await cookies();
  const demoRole = cookieStore.get(DEMO_COOKIE)?.value;

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Auth may be down; still clear local demo session cookies.
  }

  if (demoRole === "participant") {
    await clearDemoRequestsCookie();
  }

  cookieStore.delete(ORG_VERIFIED_COOKIE);
  cookieStore.delete(DEMO_COOKIE);
  cookieStore.delete(DEMO_EMAIL_COOKIE);
  redirect("/");
}

export async function signUpParticipant(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    return {
      error: "Enter your email and a password of at least 8 characters.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { account_type: "participant" },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/participant`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      error:
        "Account created, but email confirmation is enabled and no confirmation email is available. Disable Confirm email in Supabase Auth settings, then try again.",
    };
  }

  redirect("/participant");
}

export async function signInParticipant(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const demoRole = matchDemoAccount(email, password, "participant");
  if (demoRole) {
    await completeDemoSignIn(demoRole, email);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: signInErrorMessage(error.message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: signInErrorMessage("Invalid login credentials") };
  }

  await setDemoRole(null);
  const profile = await profileForUser(supabase, userId);

  if (profile?.role === "organization") {
    await supabase.auth.signOut();
    return {
      error:
        "This is an organization account. Sign in with your organization ID, email, and password.",
    };
  }

  if (profile?.role === "pending_organization") {
    redirect("/organization/status");
  }

  redirect("/participant");
}

export async function applyAsOrganization(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const services = asServiceKinds(formData.getAll("services").map(String));

  if (!organizationName || !location || !email || password.length < 8) {
    return {
      error:
        "Enter the organization name, where you are based, email, and a password of at least 8 characters.",
    };
  }

  if (services.length === 0) {
    return { error: "Choose at least one service you provide." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: "organization",
        organization_name: organizationName,
        location,
        services,
      },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/organization/status`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      error:
        "Account created, but email confirmation is enabled and no confirmation email is available. Disable Confirm email in Supabase Auth settings, then try again.",
    };
  }

  const { error: submitError } = await supabase.rpc(
    "submit_organization_application",
    {
      organization_name: organizationName,
      location,
      services,
    },
  );

  if (submitError) {
    return { error: submitError.message };
  }

  redirect("/organization/apply/thanks");
}

export async function signInOrganization(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const demoRole = matchDemoAccount(email, password, "organization");
  if (demoRole) {
    await completeDemoSignIn(demoRole, email);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: signInErrorMessage(error.message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: signInErrorMessage("Invalid login credentials") };
  }

  await setDemoRole(null);
  const profile = await profileForUser(supabase, userId);

  if (profile?.role === "participant") {
    await supabase.auth.signOut();
    return { error: "This is a participant account. Sign in from the participant door." };
  }

  if (profile?.role === "pending_organization") {
    redirect("/organization/status");
  }

  if (profile?.role !== "organization" || !profile.org_id) {
    redirect("/organization/status");
  }

  redirect("/organization/insights");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Enter the email you applied with." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/forgot-password?sent=1");
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      error: "That reset link is invalid or has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  const profile = await profileForUser(supabase, userData.user.id);

  if (profile?.role === "organization" && profile.org_id) {
    redirect("/organization/insights");
  }

  if (profile?.role === "pending_organization" || profile?.role === "organization") {
    redirect("/organization/status");
  }

  redirect("/participant");
}

export async function signInToCheckStatus(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter the email and password from your application." };
  }

  const demoRole = matchDemoAccount(email, password);
  if (demoRole) {
    await completeDemoSignIn(demoRole, email);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: signInErrorMessage(error.message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: signInErrorMessage("Invalid login credentials") };
  }

  await setDemoRole(null);
  const profile = await profileForUser(supabase, userId);

  if (profile?.role === "participant") {
    redirect("/participant");
  }

  redirect("/organization/status");
}

export async function unlockReview(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_list_applications", {
    review_password: password,
  });

  if (error) {
    return { error: "That review password is not correct." };
  }

  const cookieStore = await cookies();
  cookieStore.set(REVIEW_COOKIE, password, {
    ...cookieOptions(),
    maxAge: 60 * 60 * 8,
  });

  redirect("/review");
}

export async function decideApplication(formData: FormData) {
  const cookieStore = await cookies();
  const reviewPassword = cookieStore.get(REVIEW_COOKIE)?.value;
  const applicationId = String(formData.get("applicationId") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";

  if (!reviewPassword || !applicationId) {
    redirect("/review");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_decide_application", {
    review_password: reviewPassword,
    application_id: applicationId,
    approve,
  });

  if (error) {
    redirect("/review?error=1");
  }

  redirect("/review");
}

export async function signOutReview() {
  const cookieStore = await cookies();
  cookieStore.delete(REVIEW_COOKIE);
  redirect("/review");
}
