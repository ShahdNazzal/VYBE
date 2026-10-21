"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-sand bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl border border-sand bg-card/90 p-8 shadow-xl shadow-wine/5 backdrop-blur"
    >
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="VYBE home">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary font-display text-2xl font-bold text-primary-foreground">
            V
          </span>
          <span className="font-display text-3xl font-bold tracking-wide text-wine">VYBE</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-espresso">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your closet kept everything exactly as you left it.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="eyebrow mb-2 block text-muted-foreground">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="eyebrow mb-2 block text-muted-foreground">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary py-3 text-sm font-semibold hover:bg-wine-deep"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to VYBE?{" "}
        <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create your closet
          <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" />
        </Link>
      </p>
    </motion.div>
  );
}
