"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Leaf, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signup(name, email, password);
    if (result.ok) {
      router.push("/dashboard");
    } else {
      setError(result.error ?? "Signup failed.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand auth-brand">
          <Leaf size={28} />
          CarbonLoop
        </Link>
        <h1>Create your account</h1>
        <p className="muted">Start tracking your carbon impact today</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="input-group">
            <User size={16} />
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </label>
          <label className="input-group">
            <Mail size={16} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="input-group">
            <Lock size={16} />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {password.length > 0 && (
            <div className="password-strength">
              <div className="strength-bar">
                <span className={`strength-fill s${passwordStrength}`} style={{ width: `${(passwordStrength / 3) * 100}%` }} />
              </div>
              <span className="strength-label">
                {passwordStrength === 1 ? "Weak" : passwordStrength === 2 ? "Good" : "Strong"}
              </span>
            </div>
          )}
          <button type="submit" className="primary auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin" /> Creating account…
              </>
            ) : (
              <>
                Create Account <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link href="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
