import type { Metadata } from "next";
import { AuthCallback } from "@/components/account/AuthCallback";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
};

/** Where Google and the email sign-in link come back to (lib/auth/account). */
export default function AuthCallbackPage() {
  return <AuthCallback />;
}
