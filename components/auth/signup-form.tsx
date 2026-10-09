"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { signUp } from "@/lib/auth";
import { TEAMS } from "@/lib/mock-data/agents";
import { SIGNUP_REGIONS, signUpSchema, type SignUpInput } from "@/lib/schemas/auth";
import { AGENT_ROLES } from "@/lib/types/ticket";
import { AuthAlert, AuthHeading, AuthLink, AuthSelect, AuthShell, AuthSubmit, FloatingInput, PasswordInput } from "./auth-ui";

type Values = Record<keyof SignUpInput, string>;
type Errors = Partial<Record<keyof SignUpInput, string>>;

const EMPTY: Values = { fullName: "", email: "", mobile: "", role: "", company: "", password: "", confirm: "", team: "", country: "", timeZone: "" };
const ORDER = Object.keys(EMPTY) as (keyof SignUpInput)[];
const zoneLabel = (tz: string) => tz.split("/").pop()!.replace(/_/g, " ");

/** Desk sign-up — the ServiceOps register card in Desk colours. */
export function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof SignUpInput, value: string) => {
    setValues((v) => ({
      ...v,
      [key]: value,
      // Time zones depend on the country.
      ...(key === "country" ? { timeZone: SIGNUP_REGIONS[value]?.length === 1 ? SIGNUP_REGIONS[value][0] : "" } : {}),
    }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const text = (key: keyof SignUpInput) => ({
    id: `signup-${key}`,
    value: values[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
    error: errors[key],
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailure("");
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof SignUpInput] ??= issue.message;
      setErrors(next);
      document.getElementById(`signup-${ORDER.find((k) => next[k])}`)?.focus();
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await signUp(parsed.data);
    setLoading(false);
    if (!result.ok) {
      setFailure(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push(`/login?email=${encodeURIComponent(parsed.data.email)}`), 1500);
  };

  if (done) {
    return (
      <AuthShell width="max-w-[420px]">
        <div role="status" className="flex flex-col items-center gap-3 px-10 py-10 text-center">
          <CheckCircleIcon size={48} weight="fill" aria-hidden className="text-desk" />
          <p className="text-h2 font-bold text-ink">Account created!</p>
          <p className="text-body font-medium text-ink-muted">Redirecting to sign in…</p>
        </div>
      </AuthShell>
    );
  }

  const zones = SIGNUP_REGIONS[values.country] ?? [];

  return (
    <AuthShell>
      <div className="px-6 pt-6 pb-5 sm:px-8">
        <AuthHeading title="Get started with Desk" subtitle="Create your EVOQ Desk account" />

        {failure && (
          <AuthAlert>
            {failure} {failure.includes("Sign in") && <AuthLink href={`/login?email=${encodeURIComponent(values.email)}`}>Sign in</AuthLink>}
          </AuthAlert>
        )}

        <form onSubmit={submit} noValidate className="space-y-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <FloatingInput {...text("fullName")} label="Full name" autoComplete="name" />
            <FloatingInput {...text("email")} label="Work email" type="email" autoComplete="email" />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <FloatingInput {...text("mobile")} label="Mobile number" type="tel" autoComplete="tel" />
            <AuthSelect
              id="signup-role"
              label="Role"
              value={values.role}
              onChange={(v) => set("role", v)}
              options={AGENT_ROLES.map((r) => ({ value: r, label: r }))}
              error={errors.role}
            />
          </div>

          <FloatingInput {...text("company")} label="Company or workspace name" autoComplete="organization" />

          <div className="grid gap-2.5 sm:grid-cols-2">
            <PasswordInput {...text("password")} label="Password" autoComplete="new-password" />
            <PasswordInput {...text("confirm")} label="Confirm password" autoComplete="new-password" />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <AuthSelect id="signup-team" label="Team" value={values.team} onChange={(v) => set("team", v)} options={TEAMS.map((t) => ({ value: t.id, label: t.name }))} error={errors.team} />
            <AuthSelect
              id="signup-country"
              label="Country"
              value={values.country}
              onChange={(v) => set("country", v)}
              options={Object.keys(SIGNUP_REGIONS).map((c) => ({ value: c, label: c }))}
              error={errors.country}
            />
            <AuthSelect
              id="signup-timeZone"
              label="Time zone"
              value={values.timeZone}
              onChange={(v) => set("timeZone", v)}
              options={zones.map((z) => ({ value: z, label: zoneLabel(z) }))}
              disabled={!values.country}
              error={errors.timeZone}
            />
          </div>

          <div className="pt-1">
            <AuthSubmit loading={loading} loadingLabel="Creating account…">
              Create account <ArrowRightIcon size={14} weight="bold" aria-hidden />
            </AuthSubmit>
          </div>
        </form>

        <p className="mt-3 text-center text-body font-medium text-ink-muted">
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </p>
      </div>
    </AuthShell>
  );
}
