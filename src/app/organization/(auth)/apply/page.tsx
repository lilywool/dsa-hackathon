import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { OrganizationApplyForm } from "@/components/auth/organization-forms";

export const metadata = {
  title: "Apply as an organization",
};

export default function OrganizationApplyPage() {
  return (
    <AuthFrame
      title="Apply to join as an organization"
      description="Tell us your name, where you are based, and the services you provide. If approved, you receive an organization ID for sign-in."
    >
      <OrganizationApplyForm />
      <AuthLinks>
        Already approved?{" "}
        <TextLink href="/organization/sign-in">Sign in</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
