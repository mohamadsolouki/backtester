"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
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
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h2 className="text-[18px] font-semibold text-white">Create account</h2>
      <p className="mt-1 text-[13px] text-white/50">Set up your trading journal.</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

      <label className="mt-5 block">
        <span className="text-[12px] font-medium text-white/70">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-[#18c8bd]"
          placeholder="Your name"
        />
      </label>

      <label className="mt-4 block">
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
          minLength={8}
          className="mt-1 h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-[#18c8bd]"
          placeholder="Min 8 characters"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 h-10 w-full rounded-md bg-[#0f9f95] text-[14px] font-semibold text-white transition hover:bg-[#08746f] disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="mt-4 text-center text-[13px] text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="text-[#18c8bd] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
