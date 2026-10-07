import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // Reads ?email= (after sign-up) and ?next= from the URL, so it renders on the client inside Suspense.
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
