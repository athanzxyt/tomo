type DashboardPageProps = {
  searchParams: {
    firstName?: string;
  };
};

const toTitleCase = (value: string) => {
  if (!value) {
    return "Friend";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "Friend";
  }
  return trimmed[0].toUpperCase() + trimmed.slice(1);
};

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const firstName = toTitleCase(searchParams?.firstName ?? "");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-50">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/60 p-12 text-center shadow-xl shadow-black/30">
        <h1 className="text-4xl font-semibold text-white">Hi, {firstName}.</h1>
      </div>
    </main>
  );
}
