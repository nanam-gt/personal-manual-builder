import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const admin = await getCurrentAdmin();
  const { error } = await searchParams;

  if (admin) {
    redirect("/manuals");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand-mark">
          <KeyRound aria-hidden="true" size={28} />
        </div>
        <h1 id="login-title">ログイン</h1>
        {error === "invalid" ? (
          <p className="form-error">メールまたはパスワードが違います。</p>
        ) : null}
        <form className="stack" action="/api/login" method="post">
          <label>
            メール
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            パスワード
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit">ログイン</button>
        </form>
      </section>
    </main>
  );
}
