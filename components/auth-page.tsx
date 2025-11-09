"use client";

import * as FlagIcons from "country-flag-icons/react/3x2";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType, FormEvent, SVGProps } from "react";
import { useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Variant = "login" | "signup";

type Copy = {
  title: string;
  description: string;
  submitLabel: string;
  togglePrompt: string;
  toggleHref: string;
  toggleLabel: string;
  includeProfileFields: boolean;
};

const content: Record<Variant, Copy> = {
  login: {
    title: "Welcome back",
    description: "Log in to keep your memoir in motion",
    submitLabel: "Log in",
    togglePrompt: "Don't have an account?",
    toggleHref: "/signup",
    toggleLabel: "Sign up",
    includeProfileFields: false,
  },
  signup: {
    title: "Create your Tomo account",
    description: "Capture your story in minutes each day",
    submitLabel: "Sign up",
    togglePrompt: "Already have an account?",
    toggleHref: "/login",
    toggleLabel: "Log in",
    includeProfileFields: true,
  },
};

type FlagIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const flagComponents = FlagIcons as Record<string, FlagIconComponent>;

const getFlagIcon = (isoCode: string): FlagIconComponent => {
  return flagComponents[isoCode] ?? flagComponents.US;
};

const COUNTRY_OPTIONS = [
  { value: "+1", label: "United States (+1)", isoCode: "US" },
  { value: "+44", label: "United Kingdom (+44)", isoCode: "GB" },
  { value: "+61", label: "Australia (+61)", isoCode: "AU" },
  { value: "+65", label: "Singapore (+65)", isoCode: "SG" },
  { value: "+91", label: "India (+91)", isoCode: "IN" },
] as const;

const PHONE_E164_REGEX = /^\+[1-9]\d{6,14}$/;

const normalizePhoneNumber = (countryCode: string, rawPhone: string) => {
  const sanitizedCode = countryCode.startsWith("+")
    ? countryCode
    : `+${countryCode.replace(/[^\d]/g, "")}`;
  const nationalDigits = rawPhone.replace(/[^\d]/g, "");
  if (!nationalDigits) {
    throw new Error("Phone number is required.");
  }

  const phoneE164 = `${sanitizedCode}${nationalDigits}`;
  if (!PHONE_E164_REGEX.test(phoneE164)) {
    throw new Error("Enter a valid phone number.");
  }

  return phoneE164;
};

type FormStatus = {
  loading: boolean;
  error: string | null;
};

export function AuthPage({
  variant,
  statusParam,
}: {
  variant: Variant;
  statusParam?: string;
}) {
  const copy = content[variant];
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<FormStatus>({
    loading: false,
    error: null,
  });
  const [countryCode, setCountryCode] = useState<string>(
    COUNTRY_OPTIONS[0].value,
  );
  const selectedCountry =
    COUNTRY_OPTIONS.find((option) => option.value === countryCode) ??
    COUNTRY_OPTIONS[0];
  const SelectedFlag = getFlagIcon(selectedCountry.isoCode);
  const showVerifyNotice =
    variant === "login" && statusParam === "verify-email";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email")?.toString() ?? "").trim();
    const password = (formData.get("password")?.toString() ?? "").trim();
    const fallbackFirstName =
      (formData.get("firstName")?.toString() ?? "Friend").trim() || "Friend";

    setStatus({ loading: true, error: null });

    try {
      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      if (variant === "signup") {
        const lastName = (formData.get("lastName")?.toString() ?? "").trim();
        const countryCode = (
          formData.get("countryCode")?.toString() ?? "+1"
        ).trim();
        const phone = (formData.get("phone")?.toString() ?? "").trim();
        const phoneE164 = normalizePhoneNumber(countryCode, phone);

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName: fallbackFirstName,
              lastName,
              phoneNumber: phoneE164,
              first_name: fallbackFirstName,
              last_name: lastName,
              phone_e164: phoneE164,
            },
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/login`
                : undefined,
          },
        });

        if (error) {
          throw error;
        }

        setStatus({ loading: false, error: null });
        router.push("/login?status=verify-email");
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        const user = data.user;
        if (!user?.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error("Please verify your email before logging in.");
        }
      }

      router.push("/home");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setStatus({ loading: false, error: message });
      return;
    }

    setStatus({ loading: false, error: null });
  };

  return (
    <div className="bg-zinc-900 text-white">
      <div className="flex min-h-screen flex-col items-center justify-center gap-[1.125rem] px-6 py-8 md:py-9">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-semibold text-white"
        >
          <Image
            src="/tomo-logo-white.png"
            alt="Tomo logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-cover"
            priority
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">
              Tomo
            </p>
            <p className="text-xs text-zinc-300">Everyone Has a Story</p>
          </div>
        </Link>

        <div className="w-full max-w-sm space-y-6 font-sans">
          <div className="rounded-3xl border border-white/10 bg-white/95 p-6 text-zinc-900 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-zinc-900">
                {copy.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">{copy.description}</p>
            </div>

            {showVerifyNotice ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                Check your email and confirm your account before logging in.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {copy.includeProfileFields ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700">
                      First name
                      <input
                        type="text"
                        name="firstName"
                        required
                        placeholder="Benjamin"
                        className="mt-2 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                      />
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                      Last name
                      <input
                        type="text"
                        name="lastName"
                        required
                        placeholder="Franklin"
                        className="mt-2 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                      />
                    </label>
                  </div>

                  <label className="text-sm font-medium text-zinc-700">
                    Phone number
                    <div className="mt-2 flex gap-2">
                      <Select
                        value={countryCode}
                        onValueChange={setCountryCode}
                      >
                        <SelectTrigger className="h-11 w-24 rounded-xl border border-zinc-200 bg-transparent px-3 text-base text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                          <div className="flex items-center gap-2">
                            <SelectedFlag className="h-4 w-6 rounded-sm" />
                            <span className="text-xs text-zinc-500">
                              {selectedCountry.value}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map((option) => {
                            const OptionFlag = getFlagIcon(option.isoCode);
                            return (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                <div className="flex items-center gap-2">
                                  <OptionFlag className="h-4 w-6 rounded-sm" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <input
                        type="tel"
                        name="phone"
                        required
                        inputMode="tel"
                        placeholder="407 123 4567"
                        className="flex-1 rounded-xl border border-zinc-200 bg-transparent px-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 h-11"
                      />
                    </div>
                    <input
                      type="hidden"
                      name="countryCode"
                      value={countryCode}
                    />
                  </label>
                </>
              ) : (
                <input type="hidden" name="firstName" value="Friend" />
              )}

              <label className="text-sm font-medium text-zinc-700">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="excited@withpoke.tech"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>

              <label className="text-sm font-medium text-zinc-700">
                Password
                <input
                  type="password"
                  name="password"
                  required
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-base text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>

              <button
                type="submit"
                disabled={status.loading}
                className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {status.loading ? "Please wait" : copy.submitLabel}
              </button>
              {status.error ? (
                <p
                  className="text-center text-sm text-red-500"
                  aria-live="polite"
                >
                  {status.error}
                </p>
              ) : null}
              <p className="text-center text-sm text-zinc-500">
                {copy.togglePrompt}{" "}
                <Link
                  href={copy.toggleHref}
                  className="font-semibold text-zinc-900 underline-offset-4 hover:underline"
                >
                  {copy.toggleLabel}
                </Link>
              </p>
            </form>
          </div>

          <p className="px-6 text-center text-xs text-zinc-300">
            By clicking continue, you agree to Tomo's{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
