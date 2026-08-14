export const SESSION_COOKIE = "pmb_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;
