"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  Flame,
  Leaf,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type DashboardData = {
  carbon: { today: string; week: string; month: string; total: string };
  points: { available: number; lifetime: number };
  xp: number;
  level: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streak: number;
  missionsCompleted: number;
  activeMissions: Array<{ questRunId: string; questTemplateId: string; title?: string; ecoXp?: number; difficulty?: string }>;
  recentActivities: Array<{ questRunId: string; title: string; activityType?: string; completedAt?: string; ecoXp: number }>;
  chartData: Array<{ date: string; label: string; carbonKg: number; points: number }>;
};

function AppNav({ active }: { active: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/missions", label: "Missions" },
    { href: "/calculator", label: "Calculator" },
    { href: "/points", label: "Points" },
    { href: "/rewards", label: "Rewards" },
    { href: "/profile", label: "Profile" },
  ];
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <Leaf size={22} />
        CarbonLoop
      </Link>
      <nav className="topnav">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={active === link.href ? "on" : undefined}>
            {link.label}
          </Link>
        ))}
        {user && (
          <button
            type="button"
            className="ghost nav-logout"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}

// Export the nav for reuse across pages
export { AppNav };

function kg(value: string): string {
  return Number(value).toFixed(3);
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchDashboard();
  }, [user, authLoading, router, fetchDashboard]);

  if (authLoading || loading || !data) {
    return (
      <main className="game">
        <AppNav active="/dashboard" />
        <div className="game-body">
          <div className="skeleton-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const xpProgress = Math.round((data.xpIntoLevel / data.xpForNextLevel) * 100);
  const maxChart = Math.max(0.001, ...data.chartData.map((d) => d.carbonKg));

  return (
    <main className="game">
      <AppNav active="/dashboard" />
      <div className="game-body">
        {/* HUD */}
        <section className="hud">
          <div className="hud-level">
            <div className="level-ring" style={{ ["--fill" as string]: `${xpProgress}%` }}>
              <span>{data.level}</span>
            </div>
            <div>
              <p className="hud-title">{data.levelTitle}</p>
              <p className="hud-sub">Level {data.level}</p>
              <div className="xp-track" role="progressbar" aria-valuenow={data.xpIntoLevel} aria-valuemin={0} aria-valuemax={data.xpForNextLevel}>
                <span style={{ width: `${xpProgress}%` }} />
              </div>
              <p className="hud-sub">
                {data.xpIntoLevel} / {data.xpForNextLevel} XP to next level
              </p>
            </div>
          </div>
          <dl className="hud-stats">
            <div className="stat">
              <dt><Sparkles size={14} /> Eco XP</dt>
              <dd>{data.xp}</dd>
              <p>Lifetime earned</p>
            </div>
            <div className="stat">
              <dt><Award size={14} /> Green Points</dt>
              <dd>{data.points.available}</dd>
              <p>{data.points.lifetime} lifetime</p>
            </div>
            <div className="stat">
              <dt><TrendingUp size={14} /> CO₂e Avoided</dt>
              <dd>{kg(data.carbon.total)} kg</dd>
              <p>Evidence-tiered total</p>
            </div>
            <div className="stat">
              <dt><Flame size={14} /> Streak</dt>
              <dd>{data.streak}</dd>
              <p>Consecutive days</p>
            </div>
          </dl>
        </section>

        {/* Carbon by period */}
        <section className="block">
          <h2 className="block-title"><Leaf size={18} /> Carbon Saved</h2>
          <div className="carbon-period-grid">
            <div className="carbon-period">
              <span className="carbon-period-label">Today</span>
              <span className="carbon-period-value">{kg(data.carbon.today)} kg</span>
            </div>
            <div className="carbon-period">
              <span className="carbon-period-label">This Week</span>
              <span className="carbon-period-value">{kg(data.carbon.week)} kg</span>
            </div>
            <div className="carbon-period">
              <span className="carbon-period-label">This Month</span>
              <span className="carbon-period-value">{kg(data.carbon.month)} kg</span>
            </div>
          </div>
        </section>

        {/* 7-day chart */}
        <section className="block">
          <h2 className="block-title"><BarChart3 size={18} /> 7-Day Impact</h2>
          <div className="chart-container">
            {data.chartData.map((day) => (
              <div key={day.date} className="chart-bar-col">
                <div className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{ height: `${Math.max(2, (day.carbonKg / maxChart) * 100)}%` }}
                    title={`${day.carbonKg.toFixed(3)} kg CO₂e`}
                  />
                </div>
                <span className="chart-label">{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Active missions */}
        {data.activeMissions.length > 0 && (
          <section className="block">
            <h2 className="block-title"><Target size={18} /> Active Missions</h2>
            {data.activeMissions.map((m) => (
              <div key={m.questRunId} className="active-card" style={{ marginTop: 12 }}>
                <div>
                  <p className="eyebrow">In Progress</p>
                  <h3>{m.title}</h3>
                  <p className="chips">
                    <span className="chip strong">+{m.ecoXp} XP</span>
                    <span className="chip">{m.difficulty}</span>
                  </p>
                </div>
                <Link href="/missions" className="secondary">
                  Continue
                </Link>
              </div>
            ))}
          </section>
        )}

        {/* Recent activities */}
        <section className="block">
          <h2 className="block-title"><Zap size={18} /> Recent Activities</h2>
          {data.recentActivities.length === 0 ? (
            <div className="empty-state">
              <Target size={32} />
              <p>No activities yet. Start a mission to see your progress!</p>
              <Link href="/missions" className="secondary">Browse Missions</Link>
            </div>
          ) : (
            <div className="activity-list">
              {data.recentActivities.map((a) => (
                <div key={a.questRunId} className="activity-item">
                  <div>
                    <p className="activity-title">{a.title}</p>
                    <p className="activity-meta">
                      {a.activityType} · {a.completedAt ? new Date(a.completedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <span className="chip strong">+{a.ecoXp} XP</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
