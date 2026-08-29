"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Award, Flame, Sparkles, Star, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppNav } from "@/app/dashboard/page";

type PointsData = {
  available: number;
  lifetime: number;
  xp: number;
  level: number;
  levelTitle: string;
  streak: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

type HistoryItem = {
  eventId: string;
  type: string;
  amount: number;
  occurredAt: string;
  activityType: string | null;
  avoidedKgCo2e: string | null;
  evidenceTier: string | null;
};

export default function PointsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [points, setPoints] = useState<PointsData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, hRes] = await Promise.all([fetch("/api/points"), fetch("/api/points/history")]);
      if (pRes.ok) setPoints(await pRes.json());
      if (hRes.ok) {
        const data = await hRes.json();
        setHistory(data.history);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchData();
  }, [user, authLoading, router, fetchData]);

  if (authLoading || loading || !points) {
    return (
      <main className="game">
        <AppNav active="/points" />
        <div className="game-body">
          <div className="skeleton-grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton-card" />)}</div>
        </div>
      </main>
    );
  }

  const xpProgress = Math.round((points.xpIntoLevel / points.xpForNextLevel) * 100);

  // Achievements
  const achievements = [
    { id: "first_xp", title: "First XP", desc: "Earn your first Eco XP", earned: points.xp > 0, icon: Sparkles },
    { id: "level_2", title: "Level Up!", desc: "Reach level 2", earned: points.level >= 2, icon: TrendingUp },
    { id: "level_5", title: "Trailblazer", desc: "Reach level 5", earned: points.level >= 5, icon: Star },
    { id: "streak_3", title: "On Fire", desc: "3-day streak", earned: points.streak >= 3, icon: Flame },
    { id: "streak_7", title: "Unstoppable", desc: "7-day streak", earned: points.streak >= 7, icon: Zap },
    { id: "points_50", title: "Point Collector", desc: "Earn 50+ Green Points", earned: points.lifetime >= 50, icon: Award },
  ];

  return (
    <main className="game">
      <AppNav active="/points" />
      <div className="game-body">
        <section className="block">
          <h2 className="block-title"><Award size={18} /> Points & Progress</h2>
          <dl className="hud-stats">
            <div className="stat">
              <dt><Award size={14} /> Available Points</dt>
              <dd>{points.available}</dd>
              <p>Spendable on rewards</p>
            </div>
            <div className="stat">
              <dt><Award size={14} /> Lifetime Points</dt>
              <dd>{points.lifetime}</dd>
              <p>Total earned</p>
            </div>
            <div className="stat">
              <dt><Sparkles size={14} /> Eco XP</dt>
              <dd>{points.xp}</dd>
              <p>Level {points.level} — {points.levelTitle}</p>
            </div>
            <div className="stat">
              <dt><Flame size={14} /> Streak</dt>
              <dd>{points.streak}</dd>
              <p>Consecutive days</p>
            </div>
          </dl>
        </section>

        {/* XP progress */}
        <section className="block">
          <h2 className="block-title"><TrendingUp size={18} /> Level Progress</h2>
          <div style={{ marginTop: 12 }}>
            <div className="xp-track" role="progressbar" aria-valuenow={points.xpIntoLevel} aria-valuemin={0} aria-valuemax={points.xpForNextLevel}>
              <span style={{ width: `${xpProgress}%` }} />
            </div>
            <p className="muted" style={{ textAlign: "center", marginTop: 8 }}>
              {points.xpIntoLevel} / {points.xpForNextLevel} XP to level {points.level + 1}
            </p>
          </div>
        </section>

        {/* Achievements */}
        <section className="block">
          <h2 className="block-title"><Star size={18} /> Achievements</h2>
          <div className="achievements-grid">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.id} className={`achievement ${a.earned ? "earned" : ""}`}>
                  <Icon size={20} />
                  <div>
                    <p className="achievement-title">{a.title}</p>
                    <p className="achievement-desc">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Transaction history */}
        <section className="block">
          <h2 className="block-title"><Zap size={18} /> Transaction History</h2>
          {history.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>No transactions yet.</p>
          ) : (
            <div className="table-scroll" style={{ marginTop: 12 }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Activity</th>
                    <th>CO₂e</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.eventId}>
                      <td>{item.occurredAt.replace("T", " ").slice(0, 19)}</td>
                      <td>{item.type.replace(/_/g, " ")}</td>
                      <td>{item.amount > 0 ? `+${item.amount}` : item.amount}</td>
                      <td>{item.activityType ?? "—"}</td>
                      <td>{item.avoidedKgCo2e ? `${Number(item.avoidedKgCo2e).toFixed(3)} kg` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
