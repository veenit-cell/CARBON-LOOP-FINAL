"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Leaf,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type DashboardData = {
  trackingState: "NOT_STARTED" | "NOT_CONNECTED" | "CONNECTED_NO_DATA" | "DATA_AVAILABLE" | "CALCULATION_COMPLETE";
  googleHealthConnected: boolean;
  lastSyncedAt: string | null;
  activityRecordsCount: number;
  lastSyncedPeriod: string;
  dataSource: string;
  demoMode: boolean;
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

export { AppNav };

function kg(value: string): string {
  return Number(value).toFixed(3);
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

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

  async function handleStartTracking() {
    setSyncNotice(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingStarted: true }),
      });
      if (res.ok) {
        setSyncNotice("Tracking started! Now connect Google Health to fetch activity data.");
        await fetchDashboard();
      } else {
        setSyncNotice("Failed to start tracking.");
      }
    } catch {
      setSyncNotice("Network error starting tracking.");
    }
  }

  async function handleToggleDemoMode(enable: boolean) {
    setSyncNotice(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoMode: enable }),
      });
      if (res.ok) {
        setSyncNotice(enable ? "Demo Mode enabled. Synced events will now use simulated activity data." : "Demo Mode disabled.");
        await fetchDashboard();
      } else {
        setSyncNotice("Failed to toggle Demo Mode.");
      }
    } catch {
      setSyncNotice("Network error toggling Demo Mode.");
    }
  }

  async function handleSyncActivityData() {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const res = await fetch("/api/health/sync", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        if (json.activityRecordsCount > 0) {
          setSyncNotice("Activity data synced successfully! Ready to calculate carbon footprint.");
        } else {
          setSyncNotice("Sync complete. No new fitness records found on Google Health.");
        }
        await fetchDashboard();
      } else {
        setSyncNotice(json.message ?? "Sync failed.");
      }
    } catch {
      setSyncNotice("Network error while syncing activity data.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleCalculateCarbon() {
    setCalculating(true);
    setSyncNotice(null);
    try {
      const res = await fetch("/api/health/calculate", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSyncNotice("Carbon footprint successfully calculated!");
        await fetchDashboard();
      } else {
        setSyncNotice(json.message ?? "Calculation failed.");
      }
    } catch {
      setSyncNotice("Network error while calculating carbon footprint.");
    } finally {
      setCalculating(false);
    }
  }

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
        {/* Demo Mode Toggle Card */}
        <section className="block" style={{ border: "1px dashed rgba(78, 222, 163, 0.3)", background: "rgba(78, 222, 163, 0.03)", padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} style={{ color: "var(--secondary)" }} /> Demo Mode
              </h4>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                {data.demoMode 
                  ? "Running with mock activity data simulation. Disable to test real API sync." 
                  : "Running with real API connection. Enable to simulate activity and test flows without OAuth credentials."}
              </p>
            </div>
            <button
              type="button"
              className={data.demoMode ? "primary" : "secondary"}
              onClick={() => handleToggleDemoMode(!data.demoMode)}
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              {data.demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
            </button>
          </div>
        </section>

        {/* Tracking State & Data Connection Banner */}
        {data.trackingState === "NOT_STARTED" && (
          <section className="block" style={{ borderLeft: "4px solid var(--primary)", background: "rgba(78, 222, 163, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, margin: 0 }}>Start tracking your campus carbon footprint</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  No activity data yet. Start tracking to calculate your carbon footprint.
                </p>
              </div>
              <button
                type="button"
                className="primary"
                onClick={handleStartTracking}
                style={{ fontSize: 13, padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Sparkles size={16} /> Start Tracking
              </button>
            </div>
          </section>
        )}

        {data.trackingState === "NOT_CONNECTED" && (
          <section className="block" style={{ borderLeft: "4px solid var(--warn)", background: "#f6c45112" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, margin: 0 }}>Connect Google Health to start</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Your carbon journey hasn&apos;t started yet. Connect Google Health and sync your activity to see your personalized carbon footprint.
                </p>
              </div>
              <a href="/api/auth/google" className="primary" style={{ textDecoration: "none", fontSize: 13, padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Activity size={16} /> Connect Google Health
              </a>
            </div>
          </section>
        )}

        {data.trackingState === "CONNECTED_NO_DATA" && (
          <section className="block" style={{ borderLeft: "4px solid var(--primary)", background: "#4cd7f612" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={18} style={{ color: "var(--secondary)" }} /> Google Health Connected
                </h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  {data.lastSyncedAt 
                    ? `Last sync found no records. Waiting for activity data. (Synced at: ${new Date(data.lastSyncedAt).toLocaleString()})`
                    : "Ready to track. Sync your activity data to start calculations."}
                </p>
              </div>
              <button
                type="button"
                className="primary"
                disabled={syncing}
                onClick={handleSyncActivityData}
                style={{ fontSize: 13, padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {syncing ? <><Loader2 size={16} className="spin" /> Syncing…</> : <><RefreshCw size={16} /> Sync Activity Data</>}
              </button>
            </div>
          </section>
        )}

        {data.trackingState === "DATA_AVAILABLE" && (
          <section className="block" style={{ borderLeft: "4px solid var(--primary)", background: "rgba(76, 215, 246, 0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, margin: 0 }}>Activity Data Available</h3>
                <p className="chips" style={{ margin: "4px 0 0" }}>
                  <span className="chip strong"><Shield size={12} /> Source: {data.dataSource}</span>
                  <span className="chip"><Clock size={12} /> Synced: {data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : "Just now"}</span>
                  <span className="chip"><Activity size={12} /> Records: {data.activityRecordsCount}</span>
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="primary"
                  disabled={calculating}
                  onClick={handleCalculateCarbon}
                  style={{ fontSize: 13, padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {calculating ? <><Loader2 size={16} className="spin" /> Calculating…</> : <><Leaf size={16} /> Calculate Carbon Footprint</>}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={syncing}
                  onClick={handleSyncActivityData}
                  style={{ fontSize: 13, padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {syncing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Sync Again
                </button>
              </div>
            </div>
          </section>
        )}

        {data.trackingState === "CALCULATION_COMPLETE" && (
          <section className="block" style={{ borderLeft: "4px solid var(--secondary)", background: "#4edea312" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <p className="chips" style={{ margin: 0 }}>
                  <span className="chip strong"><Shield size={12} /> Data Source: {data.dataSource}</span>
                  <span className="chip"><Clock size={12} /> Last Synced: {data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : "Just now"}</span>
                  <span className="chip"><Activity size={12} /> Records Used: {data.activityRecordsCount}</span>
                  <span className="chip">{data.lastSyncedPeriod}</span>
                </p>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
                  Calculated from actual activity data using verified emission factors.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={true}
                  style={{ fontSize: 13, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.8 }}
                >
                  <CheckCircle2 size={14} style={{ color: "var(--secondary)" }} /> View Carbon Results
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={syncing}
                  onClick={handleSyncActivityData}
                  style={{ fontSize: 13, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {syncing ? <><Loader2 size={14} className="spin" /> Syncing…</> : <><RefreshCw size={14} /> Sync Activity Data</>}
                </button>
              </div>
            </div>
          </section>
        )}

        {syncNotice && <p className="notice" role="alert" style={{ marginBottom: 16 }}>{syncNotice}</p>}

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
              <dd>{data.trackingState === "CALCULATION_COMPLETE" ? `${kg(data.carbon.total)} kg` : "0.000 kg"}</dd>
              <p>{data.trackingState === "CALCULATION_COMPLETE" ? "Evidence-tiered total" : "Not calculated"}</p>
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
          {data.trackingState === "CALCULATION_COMPLETE" ? (
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
          ) : (
            <div className="empty-state" style={{ padding: "28px 20px" }}>
              <Leaf size={28} />
              <p>
                {data.trackingState === "NOT_STARTED" || data.trackingState === "NOT_CONNECTED"
                  ? "Your carbon journey hasn't started yet. Connect Google Health and sync your activity to see your personalized carbon footprint."
                  : "No activity data yet. Start tracking to calculate your carbon footprint."}
              </p>
            </div>
          )}
        </section>

        {/* 7-day chart */}
        <section className="block">
          <h2 className="block-title"><BarChart3 size={18} /> 7-Day Impact</h2>
          {data.trackingState === "CALCULATION_COMPLETE" ? (
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
          ) : (
            <div className="empty-state" style={{ padding: "28px 20px" }}>
              <BarChart3 size={28} />
              <p>Waiting for activity data to render your 7-day impact chart.</p>
            </div>
          )}
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
              <p>No activity data yet. Connect Google Health or complete a mission to start!</p>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
                {data.trackingState === "NOT_STARTED" && (
                  <button type="button" className="primary" onClick={handleStartTracking} style={{ fontSize: 13 }}>
                    Start Tracking
                  </button>
                )}
                {data.trackingState === "NOT_CONNECTED" && (
                  <a href="/api/auth/google" className="primary" style={{ textDecoration: "none", fontSize: 13 }}>
                    Connect Google Health
                  </a>
                )}
                {data.trackingState === "CONNECTED_NO_DATA" && (
                  <button type="button" className="primary" onClick={handleSyncActivityData} disabled={syncing} style={{ fontSize: 13 }}>
                    {syncing ? "Syncing..." : "Sync Activity Data"}
                  </button>
                )}
                {data.trackingState === "DATA_AVAILABLE" && (
                  <button type="button" className="primary" onClick={handleCalculateCarbon} disabled={calculating} style={{ fontSize: 13 }}>
                    {calculating ? "Calculating..." : "Calculate Carbon Footprint"}
                  </button>
                )}
                <Link href="/missions" className="secondary">Browse Missions</Link>
              </div>
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
