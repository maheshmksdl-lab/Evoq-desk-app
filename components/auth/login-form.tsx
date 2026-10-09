"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn } from "@/lib/auth";
import { HOME_ROUTE } from "@/lib/auth-routes";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import {
  AuthButton,
  AuthDivider,
  AuthHeading,
  AuthLink,
  AuthShell,
  AuthSubmit,
  FloatingInput,
  GoogleMark,
  MicrosoftMark,
  PasswordInput,
} from "./auth-ui";

/**
 * Desk sign-in — the ServiceOps login card in Desk colours. Signing in needs
 * no credentials: Sign in starts the session and opens Overview.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    signIn(remember);
    // Overview is home: every sign-in lands there (replace, so Back doesn't return to the form).
    router.replace(HOME_ROUTE);
  };

  const sendOtp = () => {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message);
      document.getElementById("login-email")?.focus();
      return;
    }
    setEmailError(undefined);
    toast.success(`One-time code sent to ${parsed.data.email}`, { description: "Sample mode — no email was sent." });
  };

  const sso = (provider: string) => toast(`${provider} sign-in isn't connected in this preview`, { description: "Use Sign in to continue." });

  return (
    <AuthShell>
      <div className="px-8 py-7 sm:px-10">
        <AuthHeading title="Welcome back" subtitle="Sign in to your EVOQ Desk workspace" />

        <form onSubmit={submit} noValidate className="space-y-3">
          <FloatingInput
            id="login-email"
            label="Work email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(undefined);
            }}
            error={emailError}
          />
          <PasswordInput
            id="login-password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between pt-1">
            <label className="group flex cursor-pointer items-center gap-2.5">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} className="border-ink-faint bg-white" />
              <span className="text-body font-medium text-ink-body transition-colors select-none group-hover:text-ink">Remember me</span>
            </label>
            <AuthLink href="/forgot-password" className="text-body font-semibold">
              Forgot password?
            </AuthLink>
          </div>

          <div className="pt-1">
            <AuthSubmit loading={loading} loadingLabel="Signing in…">
              Sign in <ArrowRightIcon size={15} weight="bold" aria-hidden />
            </AuthSubmit>
          </div>
        </form>

        <p className="mt-3 text-center text-body font-medium text-ink-muted">
          Don&apos;t have an account? <AuthLink href="/signup">Create your account</AuthLink>
        </p>

        <AuthDivider>Or</AuthDivider>

        <AuthButton tone="tint" onClick={sendOtp} className="mb-3">
          <EnvelopeSimpleIcon size={15} weight="duotone" aria-hidden />
          Get OTP
        </AuthButton>

        <AuthDivider>Or, login with</AuthDivider>

        <div className="grid grid-cols-2 gap-3">
          <AuthButton tone="outline" onClick={() => sso("Google")}>
            <GoogleMark /> Google
          </AuthButton>
          <AuthButton tone="outline" onClick={() => sso("Microsoft")}>
            <MicrosoftMark /> Microsoft
          </AuthButton>
        </div>
      </div>
    </AuthShell>
  );
}
