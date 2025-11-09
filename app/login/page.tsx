import { AuthPage } from "@/components/auth-page";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const statusValue = resolvedParams.status;
  const status = Array.isArray(statusValue) ? statusValue[0] : statusValue;

  return <AuthPage variant="login" statusParam={status} />;
}
