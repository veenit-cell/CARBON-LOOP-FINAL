"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bike,
  Bus,
  Calculator,
  Check,
  Footprints,
  Leaf,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppNav } from "@/app/dashboard/page";

type CalculationResult = {
  activity: { missionTitle: string; activityType: string; distanceKm?: string };
  carbon: { status: string; baselineKgCo2e?: string; actualKgCo2e?: string; avoidedKgCo2e?: string } | null;
  points: { ecoXpIssued: number; greenPointsIssued: number };
  noCarbonClaimReason?: string;
};

function kg(value: string): string {
  return Number(value).toFixed(3);
}

export default function CalculatorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activityType, setActivityType] = useState<"walking" | "cycling" | "shuttle">("walking");
  const [distanceKm, setDistanceKm] = useState("2.5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CalculationResult | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/carbon/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType, distanceKm }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message ?? "Calculation failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const activities = [
    { value: "walking" as const, label: "Walking", icon: Footprints, desc: "Walk instead of taking a motorbike" },
    { value: "cycling" as const, label: "Cycling", icon: Bike, desc: "Cycle instead of taking a motorbike" },
    { value: "shuttle" as const, label: "Shuttle", icon: Bus, desc: "Take the green shuttle" },
  ];

  return (
    <main className="game">
      <AppNav active="/calculator" />
      <div className="game-body">
        <section className="block">
          <h2 className="block-title"><Calculator size={18} /> Carbon Calculator</h2>
          <p className="muted">
            Log a green transport activity. The server calculates avoided CO₂e using verified emission factors,
            saves the activity, and awards points — all server-side.
          </p>
        </section>

        <section className="block">
          <form onSubmit={handleCalculate} className="calc-form">
            <div className="calc-activity-grid">
              {activities.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    type="button"
                    className={`calc-activity-btn ${activityType === a.value ? "calc-active" : ""}`}
                    onClick={() => setActivityType(a.value)}
                  >
                    <Icon size={24} />
                    <span className="calc-activity-label">{a.label}</span>
                    <span className="calc-activity-desc">{a.desc}</span>
                  </button>
                );
              })}
            </div>

            <label className="input-group">
              <TrendingUp size={16} />
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                placeholder="Distance in km"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                required
              />
              <span className="input-suffix">km</span>
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="primary auth-submit" disabled={loading}>
              {loading ? (
                <><Loader2 size={16} className="spin" /> Calculating…</>
              ) : (
                <><Calculator size={16} /> Calculate & Log Activity</>
              )}
            </button>
          </form>
        </section>

        {result && (
          <section className="completion">
            <p className="eyebrow">Activity Logged</p>
            <h2>{result.activity.missionTitle}</h2>

            <div className="rewards-row">
              <span className="reward-pill">
                <TrendingUp size={16} /> +{result.points.ecoXpIssued} Eco XP
              </span>
              {result.points.greenPointsIssued > 0 ? (
                <span className="reward-pill">
                  <Leaf size={16} /> +{result.points.greenPointsIssued} Green Points
                </span>
              ) : (
                <span className="reward-pill muted-pill">
                  <Leaf size={16} /> 0 Green Points
                </span>
              )}
            </div>

            {result.noCarbonClaimReason && (
              <p className="claim-note">{result.noCarbonClaimReason}</p>
            )}

            {result.carbon && result.carbon.status === "calculated" && (
              <dl className="receipt">
                <div>
                  <dt>Baseline</dt>
                  <dd>{kg(result.carbon.baselineKgCo2e!)} kg CO₂e</dd>
                </div>
                <div>
                  <dt>Actual</dt>
                  <dd>{kg(result.carbon.actualKgCo2e!)} kg CO₂e</dd>
                </div>
                <div>
                  <dt>Avoided</dt>
                  <dd className="accent">{kg(result.carbon.avoidedKgCo2e!)} kg CO₂e</dd>
                </div>
              </dl>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="secondary" onClick={() => setResult(null)}>
                Log Another
              </button>
              <a href="/dashboard" className="ghost" style={{ textDecoration: "none" }}>
                <Check size={14} /> View Dashboard
              </a>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
