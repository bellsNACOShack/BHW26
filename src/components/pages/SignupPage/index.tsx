"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FullPageLoader } from "@/components/atoms/FullPageLoader";
import { Stepper } from "@/components/molecules/Stepper";
import { AuthCard } from "@/components/organisms/AuthCard";
import { PlacementForm } from "@/components/organisms/PlacementForm";
import { SignupProfileForm } from "@/components/organisms/SignupProfileForm";
import { useAuthToken } from "@/features/auth/hooks/useAuthToken";
import type { User } from "@/features/auth/types";

const STUDENT_STEPS = ["Profile", "SIWES"];

/**
 * Students register (POST /api/auth/register) then create their placement
 * (POST /api/placements). Supervisors only need the profile step.
 */
export function SignupPage() {
  const router = useRouter();
  const token = useAuthToken();
  const [step, setStep] = useState(0);
  // Registering stores a session; this keeps an in-progress sign-up from being redirected away.
  const inFlow = useRef(false);

  useEffect(() => {
    if (token && !inFlow.current) router.replace("/dashboard");
  }, [token, router]);

  function handleRegistered(user: User) {
    if (user.role === "student") {
      setStep(1);
      return;
    }
    toast.success("Account created. Welcome to Inter.log!");
    router.replace("/dashboard");
  }

  if (token === undefined || (token && !inFlow.current)) return <FullPageLoader />;

  const signInFooter = (
    <>
      Already have an account?{" "}
      <Link href="/login" className="text-brand hover:underline">
        Sign in
      </Link>
    </>
  );

  if (step === 1) {
    return (
      <AuthCard
        heading="Welcome to Inter.log"
        aside={<Stepper steps={STUDENT_STEPS} current={1} />}
        title="SIWES placement"
        description="Your organization and training dates."
        footer={
          <Link href="/dashboard" className="text-brand hover:underline">
            I&apos;ll do this later
          </Link>
        }
      >
        <PlacementForm
          submitLabel="Finish setup"
          onSuccess={() => {
            toast.success("Your digital SIWES logbook is ready.");
            router.replace("/dashboard");
          }}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      heading="Welcome to Inter.log"
      aside={<Stepper steps={STUDENT_STEPS} current={0} />}
      title="Start your digital SIWES logbook."
      description="Identity and academic details."
      footer={signInFooter}
    >
      <SignupProfileForm onBeforeRegister={() => (inFlow.current = true)} onRegistered={handleRegistered} />
    </AuthCard>
  );
}
