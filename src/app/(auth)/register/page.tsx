"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created but login failed. Try signing in.");
    } else {
      window.location.href = "/";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white/[0.04] p-7 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_30px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <h2 className="font-display font-semibold text-[20px] text-white">Create account</h2>
      <p className="mt-1 text-[13px] text-white/45">Set up your trading journal.</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

      <label className="mt-5 block">
        <span className="eyebrow text-white/40">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1.5 h-10 w-full rounded-md border border-white/12 bg-white/[0.03] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#22c9bc]/60"
          placeholder="Your name"
        />
      </label>

      <label className="mt-4 block">
        <span className="eyebrow text-white/40">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1.5 h-10 w-full rounded-md border border-white/12 bg-white/[0.03] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#22c9bc]/60"
          placeholder="you@example.com"
        />
      </label>

      <label className="mt-4 block">
        <span className="eyebrow text-white/40">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1.5 h-10 w-full rounded-md border border-white/12 bg-white/[0.03] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#22c9bc]/60"
          placeholder="Min 8 characters"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 h-10 w-full rounded-md bg-[#0f9f95] text-[14px] font-semibold text-white transition-all hover:bg-[#08746f] active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="mt-4 text-center text-[13px] text-white/45">
        Already have an account?{" "}
        <Link href="/login" className="text-[#5eead4] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
