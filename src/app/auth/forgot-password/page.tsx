import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { ForgotPasswordForm } from "@/components/auth/organization-forms";

export const metadata = {
  title: "Reset password",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

  if (params.sent) {
    return (
      <AuthFrame
        title="Check your email"
        description="If an account exists for that address, we sent a link to choose a new password."
      >
        <AuthLinks>
          <TextLink href="/organization/sign-in">Back to organization sign in</TextLink>
        </AuthLinks>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Reset your password"
      description="Use the email from your application. We’ll send a link to choose a new password."
    >
      <ForgotPasswordForm />
      <AuthLinks>
        <TextLink href="/organization/sign-in">Back to sign in</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
