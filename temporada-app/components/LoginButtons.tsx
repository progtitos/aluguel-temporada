"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginButtons({ redirectTo }: { redirectTo: string }) {
  const supabase = createClient();

  async function login(provider: "google" | "apple") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}${redirectTo}` },
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => login("google")}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-forest-100 bg-white py-3 text-sm font-medium text-ink transition active:scale-[0.98]"
      >
        <span aria-hidden>🔵</span> Entrar com Google
      </button>
      <button
        onClick={() => login("apple")}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-ink py-3 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        <span aria-hidden></span> Entrar com Apple
      </button>
    </div>
  );
}
