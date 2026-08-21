import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { UpdatePasswordForm } from "@/components/auth/organization-forms";

export const metadata = {
  title: "Choose a new password",
};

export default function UpdatePasswordPage() {
  return (
    <AuthFrame
      title="Choose a new password"
      description="This becomes the password you use to sign in as an organization or participant."
    >
      <UpdatePasswordForm />
      <AuthLinks>
        <TextLink href="/auth/forgot-password">Request a new link</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
