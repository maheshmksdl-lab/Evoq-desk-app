"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn } from "@/lib/auth";
import { HOME_ROUTE } from "@/lib/auth-routes";
import { cn } from "@/lib/utils";
import { GoogleMark, MicrosoftMark } from "./auth-ui";
import { ProductPreview } from "./product-preview";

/**
 * Desk sign-in: brand story and a product preview on the left, the sign-in
 * card on the right (the card alone on tablets and phones). Signing in needs
 * no credentials: Sign in starts the session and opens Overview.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    signIn(remember);
    // Overview is home: every sign-in lands there (replace, so Back doesn't return to the form).
    router.replace(HOME_ROUTE);
  };

  const sso = (provider: string) => toast(`${provider} sign-in isn't connected in this preview`, { description: "Use Sign in to continue." });

  return (
    <div className="flex min-h-dvh bg-[#F7FAF9]">
      {/* ── Brand panel (desktop) ── */}
      <aside aria-label="About EVOQ Desk" className="sticky top-0 hidden h-dvh w-[55%] shrink-0 overflow-hidden lg:block" style={{ background: "linear-gradient(160deg, #FBFDFC 0%, var(--desk-surface) 45%, var(--desk-tint) 100%)" }}>
        <Decor />
        <div className="relative z-10 px-12 pt-12 xl:px-[6%] xl:pt-[3.2rem]">
          <BrandLockup size="lg" />
          <p className="mt-12 text-[15px] font-semibold tracking-[0.18em] text-desk uppercase xl:mt-14 xl:text-[16px]">Support made simple</p>
          <h2 className="mt-3 text-[40px] leading-[1.12] font-bold tracking-[-0.02em] text-ink xl:text-[46px] 2xl:text-[52px]">
            Resolve issues.
            <br />
            Build stronger
            <br />
            customer relationships.
          </h2>
          <p className="mt-6 max-w-[500px] text-[19px] leading-[1.55] text-ink-muted xl:text-[21px]">Manage every customer conversation in one place with EVOQ Desk.</p>
        </div>
        <ProductPreview />
      </aside>

      {/* ── Sign-in card ── */}
      <main id="main" className="relative flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-14">
        {/* Phones / tablets get a soft brand wash instead of the panel. */}
        <div className="pointer-events-none absolute inset-0 lg:hidden" aria-hidden style={{ background: "radial-gradient(circle at 0% 0%, var(--desk-tint) 0%, transparent 55%), radial-gradient(circle at 100% 100%, var(--desk-tint) 0%, transparent 50%)" }} />
        <section
          aria-labelledby="login-title"
          className="relative w-full max-w-[588px] rounded-[28px] border border-line-soft bg-white px-6 py-10 shadow-[0_24px_60px_rgb(16_24_40/0.06),0_2px_8px_rgb(16_24_40/0.03)] sm:px-11 sm:py-12"
        >
          <div className="flex justify-center">
            <BrandLockup size="md" />
          </div>
          <h1 id="login-title" className="mt-8 text-center text-[32px] leading-tight font-bold tracking-[-0.02em] text-ink sm:mt-10 sm:text-[40px]">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-[16px] text-ink-muted sm:text-[18px]">Sign in to your EVOQ Desk account</p>

          <form onSubmit={submit} noValidate className="mt-9 sm:mt-11">
            <label htmlFor="login-email" className="block text-[16px] font-semibold text-ink">
              Email
            </label>
            <Field icon={<EnvelopeSimpleIcon size={22} aria-hidden />} className="mt-2.5">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="mt-6 flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="text-[16px] font-semibold text-ink">
                Password
              </label>
              <Link href="/forgot-password" className="text-[15px] font-medium text-desk transition-colors hover:text-desk-press focus-visible:outline-2 focus-visible:outline-desk-action sm:text-[16px]">
                Forgot password?
              </Link>
            </div>
            <Field
              icon={<LockSimpleIcon size={22} aria-hidden />}
              className="mt-2.5"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-desk-tint hover:text-ink-body focus-visible:outline-2 focus-visible:outline-desk-action"
                >
                  {showPassword ? <EyeSlashIcon size={22} aria-hidden /> : <EyeIcon size={22} aria-hidden />}
                </button>
              }
            >
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>

            <label className="group mt-6 flex w-fit cursor-pointer items-center gap-3">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
                className="size-[22px] rounded-[6px] border-[1.5px] border-ink-faint bg-white data-[state=checked]:border-desk data-[state=checked]:bg-desk [&_svg]:size-4"
              />
              <span className="text-[16px] text-ink-body transition-colors select-none group-hover:text-ink">Keep me signed in</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-desk text-[18px] font-semibold text-white shadow-[0_6px_18px_rgb(15_157_122/0.28)] transition-colors hover:bg-desk-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:bg-desk-hover"
            >
              {loading ? (
                <>
                  <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4" role="separator" aria-label="or continue with">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[15px] whitespace-nowrap text-ink-muted">or continue with</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1 min-[1400px]:grid-cols-2">
            <SsoButton onClick={() => sso("Google")}>
              <GoogleMark size={22} /> Continue with Google
            </SsoButton>
            <SsoButton onClick={() => sso("Microsoft")}>
              <MicrosoftMark size={21} /> Continue with Microsoft
            </SsoButton>
          </div>

          <p className="mt-9 text-center text-[16px] text-ink-muted">
            New to EVOQ Desk?{" "}
            <Link href="/signup" className="ml-1 font-semibold text-desk transition-colors hover:text-desk-press focus-visible:outline-2 focus-visible:outline-desk-action">
              Create an account
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

const inputClass = "h-full min-w-0 flex-1 bg-transparent text-[17px] text-ink placeholder:text-ink-muted focus:outline-none";

/** Bordered field row: leading icon, the input, optional trailing control. */
function Field({ icon, trailing, children, className }: { icon: ReactNode; trailing?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-14 items-center gap-3.5 rounded-xl border-[1.5px] border-line bg-white pr-3 pl-4 text-ink-muted transition-all focus-within:border-desk focus-within:shadow-[0_0_0_3px_var(--desk-10)] sm:pl-5",
        className,
      )}
    >
      <span className="shrink-0">{icon}</span>
      {children}
      {trailing}
    </div>
  );
}

function SsoButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center justify-center gap-3 rounded-xl border-[1.5px] border-line bg-white px-3 text-[16px] font-medium whitespace-nowrap text-ink transition-colors hover:border-desk-soft hover:bg-desk-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
    >
      {children}
    </button>
  );
}

/** Headset mark (cropped from the Desk logo) + "EVOQ Desk". */
function BrandLockup({ size }: { size: "md" | "lg" }) {
  const box = size === "lg" ? "size-[60px] rounded-[16px]" : "size-[56px] sm:size-[62px] rounded-[16px]";
  return (
    <span className="inline-flex items-center gap-4">
      <span className={cn("relative shrink-0 overflow-hidden", box)}>
        <Image src="/media/evoq-desk-logo-1.png" alt="" width={135} height={55} priority className="absolute top-0 left-0 h-full w-auto max-w-none" draggable={false} />
      </span>
      <span className={cn("font-bold tracking-[-0.02em] whitespace-nowrap text-ink", size === "lg" ? "text-[34px]" : "text-[30px] sm:text-[34px]")}>EVOQ Desk</span>
    </span>
  );
}

/** Soft brand shapes and the blurred plant behind the preview. */
function Decor() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute top-[16%] -right-[6%] h-[64%] w-[38%] rounded-[56px] opacity-70" style={{ background: "linear-gradient(200deg, var(--desk-soft) 0%, var(--desk-tint) 60%, transparent 100%)", transform: "rotate(-8deg)" }} />
      <div className="absolute -bottom-[4%] left-[4%] h-[50%] w-[30%] rounded-[40px] bg-white/60 blur-[2px]" style={{ transform: "rotate(-6deg)" }} />
      <svg viewBox="0 0 200 260" className="absolute bottom-[2%] left-[-2%] w-[22%] opacity-80 blur-[5px]">
        <path d="M100 260 C 98 200, 96 150, 70 100" stroke="#2f6b45" strokeWidth="4" fill="none" />
        <path d="M70 100 C 30 90, 10 50, 20 10 C 60 30, 85 60, 70 100 Z" fill="#3f8a55" />
        <path d="M96 170 C 140 150, 175 160, 195 130 C 160 115, 120 125, 96 170 Z" fill="#4c9a61" />
        <path d="M98 210 C 60 200, 25 215, 5 190 C 40 170, 80 180, 98 210 Z" fill="#357a4b" />
        <path d="M99 140 C 120 100, 150 80, 170 40 C 130 50, 105 90, 99 140 Z" fill="#5aa86d" />
      </svg>
    </div>
  );
}
