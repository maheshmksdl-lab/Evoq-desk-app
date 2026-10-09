"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { CaretDownIcon, EyeIcon, EyeSlashIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { DeskLogoImage } from "@/components/layout/desk-logo";
import { cn } from "@/lib/utils";

/**
 * Desk sign-in / sign-up building blocks — the ServiceOps auth layout
 * (gradient backdrop, frosted card with an accent bar, floating-label fields,
 * pill buttons) re-coloured with the Desk palette tokens.
 */

/** Page backdrop + card + footer shared by every auth screen. */
export function AuthShell({ children, width = "max-w-[460px]" }: { children: ReactNode; width?: string }) {
  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4 py-6"
      style={{ background: "linear-gradient(135deg, var(--desk-surface) 0%, var(--desk-tint) 50%, color-mix(in srgb, var(--desk-soft) 40%, white) 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 size-[500px] rounded-full opacity-40" style={{ background: "radial-gradient(circle, var(--desk-soft) 0%, transparent 70%)" }} />
        <div className="absolute -right-40 -bottom-40 size-[600px] rounded-full opacity-25" style={{ background: "radial-gradient(circle, var(--desk-hover) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/4 size-[300px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--desk) 0%, transparent 70%)" }} />
      </div>

      <main
        id="main"
        className={cn("relative w-full overflow-hidden rounded-3xl border border-white/70 bg-white/90 backdrop-blur-xl", width)}
        style={{ boxShadow: "0 25px 60px rgb(15 157 122 / 0.12), 0 8px 24px rgb(16 24 40 / 0.06)" }}
      >
        {/* Accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, var(--desk) 0%, var(--desk-action) 50%, var(--desk-hover) 100%)" }} />
        {children}
        <footer className="border-t border-line-soft bg-desk-surface px-8 py-3.5 text-center sm:px-10">
          <p className="text-2xs font-medium text-ink-muted">
            © 2026 EVOQ Desk ·{" "}
            <Link href="#" className="text-desk hover:underline">
              Privacy
            </Link>{" "}
            ·{" "}
            <Link href="#" className="text-desk hover:underline">
              Terms
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

/** Logo + heading block at the top of the card. */
export function AuthHeading({ title, subtitle, center, icon }: { title: string; subtitle: ReactNode; center?: boolean; icon?: ReactNode }) {
  return (
    <>
      <div className="mb-5 flex justify-center">
        <DeskLogoImage className="h-9" priority />
      </div>
      {icon && <div className="mb-5 flex justify-center">{icon}</div>}
      <div className={cn("mb-5", center && "text-center")}>
        <h1 className="text-h1 font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-0.5 text-body font-medium text-ink-muted">{subtitle}</p>
      </div>
    </>
  );
}

/** Form-level failure (wrong password, account exists…). */
export function AuthAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-body font-medium text-[#B91C1C]">
      <WarningCircleIcon size={16} weight="fill" aria-hidden className="shrink-0 text-[#EF4444]" />
      {children}
    </div>
  );
}

const fieldBase =
  "w-full rounded-xl border-[1.5px] border-line bg-sidebar text-body font-medium text-ink outline-none transition-all focus:border-desk focus:bg-desk-surface focus:shadow-[0_0_0_3px_var(--desk-10)] aria-invalid:border-destructive aria-invalid:focus:shadow-[0_0_0_3px_rgb(239_68_68/0.12)]";

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1 pl-1 text-caption font-medium text-destructive">
      {error}
    </p>
  );
}

/**
 * Text input whose label sits inside the field and floats up on focus or once
 * filled (pure CSS — `peer` + `:placeholder-shown`).
 */
export function FloatingInput({
  id,
  label,
  error,
  trailing,
  className,
  ...props
}: Omit<ComponentProps<"input">, "id" | "placeholder"> & { id: string; label: string; error?: string; trailing?: ReactNode }) {
  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          placeholder=" "
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(fieldBase, "peer h-[52px] px-4 pt-5 pb-1.5", trailing && "pr-11")}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-body font-medium text-ink-faint transition-all duration-200",
            "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-2xs peer-focus:text-desk",
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-2xs",
          )}
        >
          {label}
        </label>
        {trailing && <div className="absolute top-1/2 right-2.5 -translate-y-1/2">{trailing}</div>}
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}

/** Password field with the show / hide toggle. */
export function PasswordInput(props: Omit<ComponentProps<typeof FloatingInput>, "type" | "trailing">) {
  const [show, setShow] = useState(false);
  return (
    <FloatingInput
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="rounded-lg p-1 text-ink-faint transition-colors hover:bg-desk-tint hover:text-ink-body focus-visible:outline-2 focus-visible:outline-desk-action"
        >
          {show ? <EyeSlashIcon size={17} weight="duotone" aria-hidden /> : <EyeIcon size={17} weight="duotone" aria-hidden />}
        </button>
      }
    />
  );
}

/** Native select with a placeholder option and a caret, styled like the inputs. */
export function AuthSelect({
  id,
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(fieldBase, "h-[52px] cursor-pointer appearance-none truncate pr-9 pl-4 disabled:cursor-not-allowed disabled:opacity-50", !value && "text-ink-faint")}
        >
          <option value="" disabled>
            {label}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-ink">
              {o.label}
            </option>
          ))}
        </select>
        <CaretDownIcon size={13} weight="bold" aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-faint" />
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Full-width brand button with a loading state. */
export function AuthSubmit({ loading, loadingLabel, children }: { loading: boolean; loadingLabel: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-button font-bold text-white transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action",
        loading
          ? "scale-[0.99] bg-desk-hover"
          : "bg-[linear-gradient(135deg,var(--desk)_0%,var(--desk-action)_100%)] shadow-[0_4px_16px_rgb(15_157_122/0.35)] hover:bg-[linear-gradient(135deg,var(--desk-press)_0%,var(--desk)_100%)]",
      )}
    >
      {loading ? (
        <>
          <Spinner /> {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Secondary tinted / outlined button (OTP, back to sign in, SSO). */
export function AuthButton({ tone = "tint", className, ...props }: ComponentProps<"button"> & { tone?: "tint" | "outline" | "muted" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] py-2.5 text-button-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:opacity-60",
        tone === "tint" && "border-desk-soft bg-desk-tint text-desk hover:border-desk hover:bg-desk-surface",
        tone === "outline" && "border-line bg-white text-ink-body hover:border-desk-soft hover:bg-desk-surface",
        tone === "muted" && "border-line bg-sidebar text-ink-muted hover:border-ink-faint hover:text-ink-body",
        className,
      )}
    />
  );
}

/** "— OR —" rule between sections. */
export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-line-soft" />
      <span className="text-caption font-semibold tracking-wider whitespace-nowrap text-ink-faint uppercase">{children}</span>
      <div className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

/** Inline brand link-button ("Forgot password?", "Create your account"). */
export function AuthLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("font-bold text-desk transition-colors hover:text-desk-press focus-visible:outline-2 focus-visible:outline-desk-action", className)}>
      {children}
    </Link>
  );
}

export function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
    </svg>
  );
}
