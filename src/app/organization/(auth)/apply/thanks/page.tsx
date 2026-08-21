import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";

export const metadata = {
  title: "Application submitted",
};

export default function OrganizationApplyThanksPage() {
  return (
    <AuthFrame
      title="We have your application"
      description="Someone on the Haven team will review it. If you are approved, you will receive an organization ID. Use Check status with your email and password to see the decision."
    >
      <AuthLinks>
        <TextLink href="/organization/status">Check application status</TextLink>
        <span className="mx-2">·</span>
        <TextLink href="/">Back home</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
