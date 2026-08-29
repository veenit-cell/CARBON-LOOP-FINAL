"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  Flame,
  Leaf,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppNav } from "@/app/dashboard/page";

type ProfileData = {
  profile: {
    displayName: string;
    email: string;
    preferences: { notifications: boolean; darkMode: boolean };
    googleHealth?: { connected: boolean; connectedAt?: string; scope?: string };
  };
  stats: {
    level: number;
    levelTitle: string;
    xp: number;
    greenPoints: number;
    avoidedKgCo2e: string;
    missionsCompleted: number;
    streakDays: number;
  };
  badges: Array<{ id: string; title: string; description: string; earned: boolean }>;
};

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) setProfile(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchProfile();
  }, [user, authLoading, router, fetchProfile]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (authLoading || loading || !profile) {
    return (
      <main className="game">
        <AppNav active="/profile" />
        <div className="game-body">
          <div className="skeleton-grid">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton-card" />)}</div>
        </div>
      </main>
    );
  }

  const { stats, badges } = profile;

  return (
    <main className="game">
      <AppNav active="/profile" />
      <div className="game-body">
        {/* Profile header */}
        <section className="block profile-header">
          <div className="profile-avatar">
            <User size={32} />
          </div>
          <div>
            <h2>{profile.profile.displayName}</h2>
            <p className="muted"><Mail size={12} /> {profile.profile.email}</p>
            <p className="chips" style={{ marginTop: 8 }}>
              <span className="chip strong">Level {stats.level} · {stats.levelTitle}</span>
              <span className="chip"><Flame size={12} /> {stats.streakDays} day streak</span>
            </p>
          </div>
        </section>

        {/* Impact stats */}
        <section className="block">
          <h2 className="block-title"><TrendingUp size={18} /> Your Impact</h2>
          <dl className="hud-stats">
            <div className="stat">
              <dt><Sparkles size={14} /> Eco XP</dt>
              <dd>{stats.xp}</dd>
              <p>Lifetime earned</p>
            </div>
            <div className="stat">
              <dt><Award size={14} /> Green Points</dt>
              <dd>{stats.greenPoints}</dd>
              <p>Total earned</p>
            </div>
            <div className="stat">
              <dt><Leaf size={14} /> CO₂e Avoided</dt>
              <dd>{Number(stats.avoidedKgCo2e).toFixed(3)} kg</dd>
              <p>Evidence-based</p>
            </div>
            <div className="stat">
              <dt><Target size={14} /> Missions</dt>
              <dd>{stats.missionsCompleted}</dd>
              <p>Completed</p>
            </div>
          </dl>
        </section>

        {/* Google Health Integration */}
        <section className="block">
          <h2 className="block-title"><Activity size={18} /> Google Health & Fitness</h2>
          <p className="muted">
            Connect Google Health to sync your step counts and activity data directly into CarbonLoop missions.
          </p>
          <div style={{ marginTop: 14 }}>
            {profile.profile.googleHealth?.connected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="achievement earned" style={{ opacity: 1, padding: "14px 16px" }}>
                  <CheckCircle2 size={24} style={{ color: "var(--secondary)" }} />
                  <div>
                    <p className="achievement-title" style={{ color: "var(--secondary)", fontSize: 14 }}>
                      Google Health Connected
                    </p>
                    <p className="achievement-desc">
                      Scope: Activity/Fitness Read ({profile.profile.googleHealth.scope || "https://www.googleapis.com/auth/fitness.activity.read"})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ghost"
                  style={{ width: "fit-content", fontSize: 13 }}
                  onClick={async () => {
                    await fetch("/api/auth/google/disconnect", { method: "POST" });
                    await fetchProfile();
                  }}
                >
                  Disconnect Google Health
                </button>
              </div>
            ) : (
              <a
                href="/api/auth/google"
                className="primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", width: "auto" }}
              >
                <Activity size={16} /> Connect Google Health
              </a>
            )}
          </div>
        </section>

        {/* Badges */}
        <section className="block">
          <h2 className="block-title"><Star size={18} /> Badges</h2>
          <div className="achievements-grid">
            {badges.map((badge) => (
              <div key={badge.id} className={`achievement ${badge.earned ? "earned" : ""}`}>
                <Shield size={20} />
                <div>
                  <p className="achievement-title">{badge.title}</p>
                  <p className="achievement-desc">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Logout */}
        <section className="block">
          <button type="button" className="ghost" onClick={handleLogout} style={{ width: "100%" }}>
            <LogOut size={16} /> Log Out
          </button>
        </section>
      </div>
    </main>
  );
}
