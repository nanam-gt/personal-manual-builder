import { KeyRound } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand-mark">
          <KeyRound aria-hidden="true" size={28} />
        </div>
        <h1 id="login-title">ログイン</h1>
        <form className="stack" action="/manuals">
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
