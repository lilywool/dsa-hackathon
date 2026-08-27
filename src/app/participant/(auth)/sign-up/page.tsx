import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { ParticipantSignUpForm } from "@/components/auth/participant-forms";

export const metadata = {
  title: "Create a participant account",
};

export default function ParticipantSignUpPage() {
  return (
    <AuthFrame
      title="Create a participant account"
      description="Prototype Demo Dev Login"
    >
      <ParticipantSignUpForm />
      <AuthLinks>
        Already have an account?{" "}
        <TextLink href="/participant/sign-in">Sign in</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
