import { AuthPage } from "@/components/auth-page";

type LoginPageProps = {
  searchParams: {
    status?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <AuthPage variant="login" statusParam={searchParams?.status} />;
}
