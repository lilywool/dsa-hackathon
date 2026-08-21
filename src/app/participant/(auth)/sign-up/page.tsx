import { AuthFrame, AuthLinks, TextLink } from "@/components/auth/auth-frame";
import { ParticipantSignUpForm } from "@/components/auth/participant-forms";

export const metadata = {
  title: "Create a participant account",
};

export default function ParticipantSignUpPage() {
  return (
    <AuthFrame
      title="Create a participant account"
      description="A regular email and password is enough. You can start looking for help right after."
    >
      <ParticipantSignUpForm />
      <AuthLinks>
        Already have an account?{" "}
        <TextLink href="/participant/sign-in">Sign in</TextLink>
      </AuthLinks>
    </AuthFrame>
  );
}
