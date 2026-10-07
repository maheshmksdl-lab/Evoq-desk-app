"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { DeskLogoImage } from "@/components/layout/desk-logo";
import { requestPasswordReset } from "@/lib/auth";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { AuthHeading, AuthShell, AuthSubmit, FloatingInput } from "./auth-ui";

/** Password reset request — the ServiceOps forgot-password card in Desk colours. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      document.getElementById("reset-email")?.focus();
      return;
    }
    setLoading(true);
    await requestPasswordReset(parsed.data.email);
    setLoading(false);
    setSent(true);
  };

  return (
    <AuthShell width="max-w-[420px]">
      <div className="px-8 py-8">
        {!sent ? (
          <>
            <AuthHeading
              center
              title="Forgot password?"
              subtitle="Enter your email and we'll send you a link to reset your password."
              icon={
                <span className="inline-flex size-14 items-center justify-center rounded-2xl border-[1.5px] border-desk-soft bg-desk-tint text-desk">
                  <EnvelopeSimpleIcon size={26} weight="duotone" aria-hidden />
                </span>
              }
            />
            <form onSubmit={submit} noValidate className="space-y-4">
              <FloatingInput
                id="reset-email"
                label="Email address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(undefined);
                }}
                error={error}
              />
              <AuthSubmit loading={loading} loadingLabel="Sending…">
                Send reset link <ArrowRightIcon size={14} weight="bold" aria-hidden />
              </AuthSubmit>
            </form>
          </>
        ) : (
          <div role="status" className="py-2 text-center">
            <div className="mb-5 flex justify-center">
              <DeskLogoImage className="h-9" />
            </div>
            <div className="mb-4 flex justify-center">
              <span className="inline-flex size-16 items-center justify-center rounded-2xl border-[1.5px] border-desk-soft bg-desk-tint">
                <CheckCircleIcon size={32} weight="fill" aria-hidden className="text-desk" />
              </span>
            </div>
            <h1 className="mb-2 text-h1 font-extrabold text-ink">Check your email</h1>
            <p className="mb-1 text-body font-medium text-ink-muted">We sent a reset link to</p>
            <p className="mb-6 text-body font-bold text-desk">{email.trim()}</p>
            <div className="mb-6 rounded-xl border border-line-soft bg-desk-surface px-4 py-3 text-caption font-medium text-ink-muted">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button type="button" onClick={() => setSent(false)} className="font-bold text-desk hover:underline">
                try again
              </button>
            </div>
          </div>
        )}

        <Link
          href="/login"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-line bg-sidebar py-2.5 text-button-sm font-bold text-ink-muted transition-all hover:border-ink-faint hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
        >
          <ArrowLeftIcon size={14} weight="bold" aria-hidden />
          Back to Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
