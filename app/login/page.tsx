import { KeyRound } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { login } from "./actions";

export default async function LoginPage() {
  const cookieStore = await cookies();

  if (cookieStore.get(SESSION_COOKIE)?.value) {
    redirect("/manuals");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand-mark">
          <KeyRound aria-hidden="true" size={28} />
        </div>
        <h1 id="login-title">ログイン</h1>
        <form className="stack" action={login}>
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
