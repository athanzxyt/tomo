import Image from "next/image";
import Link from "next/link";

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

export function AuthPage({ variant }: { variant: Variant }) {
  const copy = content[variant];

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

            <form
              action="/dashboard"
              method="get"
              className="mt-6 flex flex-col gap-4"
            >
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
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="+1 407 123 4567"
                      className="mt-2 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
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
                className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800"
              >
                {copy.submitLabel}
              </button>
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
