import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";

export default async function ManualsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isAuthenticated = Boolean(cookieStore.get(SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    redirect("/login");
  }

  return children;
}
