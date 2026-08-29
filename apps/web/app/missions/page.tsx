"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bike,
  Bus,
  Check,
  Footprints,
  Leaf,
  Loader2,
  Lock,
  Salad,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppNav } from "@/app/dashboard/page";

type MissionData = {
  questTemplateId: string;
  title: string;
  blurb: string;
  difficulty: string;
  activityType: string;
  ecoXp: number;
  estimatedPoints: number;
  estimatedCo2e: string;
  carbonClaim: boolean;
  evidenceTier: string;
  status: "available" | "active" | "completed";
  activeRunId: string | null;
  completedCount: number;
  requiresToken: boolean;
};

const ACTIVITY_ICONS: Record<string, typeof Footprints> = {
  walking: Footprints,
  cycling: Bike,
  shuttle: Bus,
  consumption: Salad,
};

function kg(value: string): string {
  return Number(value).toFixed(3);
}

export default function MissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [hasActiveRun, setHasActiveRun] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"available" | "active" | "completed">("available");

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch("/api/missions");
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions);
        setHasActiveRun(data.hasActiveRun);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchMissions();
  }, [user, authLoading, router, fetchMissions]);

  async function startMission(questTemplateId: string) {
    setActionLoading(questTemplateId);
    setNotice(null);
    try {
      const res = await fetch(`/api/missions/${encodeURIComponent(questTemplateId)}/start`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setNotice("Mission started! Complete it to earn rewards.");
        await fetchMissions();
        setTab("active");
      } else {
        setNotice(data.message ?? "Failed to start mission.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function completeMission(questRunId: string) {
    setActionLoading(questRunId);
    setNotice(null);
    try {
      const res = await fetch(`/api/missions/${encodeURIComponent(questRunId)}/complete`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const o = data.outcome;
        setNotice(
          `Mission complete! +${o.ecoXpIssued} XP${o.greenPointsIssued > 0 ? `, +${o.greenPointsIssued} Green Points` : ""}${o.leveledUpTo ? ` — Level up to ${o.leveledUpTo}!` : ""}`
        );
        await fetchMissions();
        setTab("completed");
      } else {
        setNotice(data.message ?? "Failed to complete mission.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = missions.filter((m) => m.status === tab || (tab === "available" && m.status === "available") || (tab === "completed" && m.completedCount > 0 && m.status !== "active"));

  if (authLoading || loading) {
    return (
      <main className="game">
        <AppNav active="/missions" />
        <div className="game-body">
          <div className="skeleton-grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton-card" />)}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="game">
      <AppNav active="/missions" />
      <div className="game-body">
        <section className="block">
          <h2 className="block-title"><Target size={18} /> Missions</h2>
          <p className="muted">Complete missions to earn Eco XP and Green Points. One mission runs at a time.</p>

          <div className="tab-bar">
            {(["available", "active", "completed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`tab ${tab === t ? "tab-active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="tab-count">
                  {t === "completed"
                    ? missions.filter((m) => m.completedCount > 0).length
                    : missions.filter((m) => m.status === t).length}
                </span>
              </button>
            ))}
          </div>
        </section>

        {notice && <p className="notice" role="alert">{notice}</p>}

        <div className="mission-grid">
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <Target size={32} />
              <p>No {tab} missions right now.</p>
            </div>
          )}
          {filtered.map((mission) => {
            const Icon = ACTIVITY_ICONS[mission.activityType] ?? Leaf;
            return (
              <article key={mission.questTemplateId} className={`mission ${mission.difficulty.toLowerCase()}`}>
                <header>
                  <span className="mission-icon"><Icon size={20} /></span>
                  <span className="badge">{mission.difficulty}</span>
                </header>
                <h3>{mission.title}</h3>
                <p className="muted">{mission.blurb}</p>
                <p className="chips">
                  <span className="chip strong">+{mission.ecoXp} XP</span>
                  {mission.carbonClaim ? (
                    <span className="chip">+{mission.estimatedPoints} PTS · {kg(mission.estimatedCo2e)} kg CO₂e</span>
                  ) : (
                    <span className="chip warn">Eco XP only — no CO₂e claim</span>
                  )}
                  <span className="chip">Evidence {mission.evidenceTier}</span>
                </p>
                <footer>
                  {mission.status === "active" && mission.activeRunId ? (
                    <button
                      type="button"
                      className="primary"
                      disabled={actionLoading === mission.activeRunId}
                      onClick={() => completeMission(mission.activeRunId!)}
                    >
                      {actionLoading === mission.activeRunId ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                      Complete Mission
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary"
                      disabled={hasActiveRun || mission.requiresToken || actionLoading === mission.questTemplateId}
                      onClick={() => startMission(mission.questTemplateId)}
                    >
                      {mission.requiresToken ? (
                        <><Lock size={14} /> Token Required</>
                      ) : actionLoading === mission.questTemplateId ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        "Start Mission"
                      )}
                    </button>
                  )}
                  {mission.completedCount > 0 && (
                    <span className="done"><Check size={14} /> {mission.completedCount}×</span>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
