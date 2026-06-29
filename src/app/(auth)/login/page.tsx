"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h2 className="text-[18px] font-semibold text-white">Sign in</h2>
      <p className="mt-1 text-[13px] text-white/50">Enter your credentials to access the platform.</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

      <label className="mt-5 block">
        <span className="text-[12px] font-medium text-white/70">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-[#18c8bd]"
          placeholder="you@example.com"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[12px] font-medium text-white/70">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-[#18c8bd]"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 h-10 w-full rounded-md bg-[#0f9f95] text-[14px] font-semibold text-white transition hover:bg-[#08746f] disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="mt-4 text-center text-[13px] text-white/50">
        No account?{" "}
        <Link href="/register" className="text-[#18c8bd] hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
