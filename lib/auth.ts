import { SESSION_COOKIE } from "@/lib/auth-routes";
import { AGENTS } from "@/lib/mock-data/agents";
import type { SignUpInput } from "@/lib/schemas/auth";

/**
 * Mock authentication for this frontend-only build. Signing in needs no
 * credentials: it just starts a session (a cookie the route guard in
 * proxy.ts checks). Accounts created on /signup are kept in localStorage
 * with a SHA-256 password hash. Swap this module for real auth endpoints —
 * the pages only call these functions.
 */

const ACCOUNTS_KEY = "desk-accounts";

interface StoredAccount {
  name: string;
  email: string;
  passwordHash: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const normalize = (email: string) => email.trim().toLowerCase();

async function hash(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function storedAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[];
  } catch {
    return [];
  }
}

export type AuthResult = { ok: true } | { ok: false; error: string };

/** Starts a session — no credentials needed. "Remember me" keeps it for 30 days, otherwise for a working day. */
export function signIn(remember: boolean) {
  document.cookie = `${SESSION_COOKIE}=true; path=/; max-age=${remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8}; SameSite=Lax`;
}

export function hasSession() {
  return document.cookie.split("; ").includes(`${SESSION_COOKIE}=true`);
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  await delay(800);
  const email = normalize(input.email);
  if (AGENTS.some((a) => a.email === email) || storedAccounts().some((a) => a.email === email)) {
    return { ok: false, error: "An account with this email already exists. Sign in instead." };
  }
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...storedAccounts(), { name: input.fullName, email, passwordHash: await hash(input.password) }]));
  } catch {
    return { ok: false, error: "Your browser blocked storage, so the account couldn't be saved." };
  }
  return { ok: true };
}

/** Always succeeds, so the page never reveals which emails have accounts. */
export async function requestPasswordReset(email: string): Promise<void> {
  void email;
  await delay(800);
}

export function signOut() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
