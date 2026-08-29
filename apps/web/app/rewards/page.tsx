"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Award, Check, Gift, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppNav } from "@/app/dashboard/page";

type RewardData = {
  rewardItemId: string;
  title: string;
  blurb: string;
  greenPointsCost: number;
  affordable: boolean;
  owned: number;
};

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards");
      if (res.ok) {
        const data = await res.json();
        setRewards(data.rewards);
        setAvailablePoints(data.availablePoints);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchRewards();
  }, [user, authLoading, router, fetchRewards]);

  async function redeemReward(rewardItemId: string) {
    setActionLoading(rewardItemId);
    setNotice(null);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/rewards/${encodeURIComponent(rewardItemId)}/redeem`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setNotice("Reward redeemed successfully! Points have been deducted.");
        await fetchRewards();
      } else {
        setNotice(data.message ?? "Failed to redeem reward.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="game">
        <AppNav active="/rewards" />
        <div className="game-body">
          <div className="skeleton-grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton-card" />)}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="game">
      <AppNav active="/rewards" />
      <div className="game-body">
        <section className="block">
          <h2 className="block-title"><Gift size={18} /> Reward Marketplace</h2>
          <p className="muted">
            Spend Green Points on campus rewards. All redemptions are verified and processed server-side.
            Demo rewards are clearly labelled.
          </p>
          <p className="chips" style={{ marginTop: 12 }}>
            <span className="chip strong"><Award size={12} /> {availablePoints} points available</span>
          </p>
        </section>

        {notice && <p className="notice" role="alert">{notice}</p>}

        {/* Confirmation modal */}
        {confirmId && (() => {
          const reward = rewards.find((r) => r.rewardItemId === confirmId);
          if (!reward) return null;
          return (
            <div className="modal-overlay" onClick={() => setConfirmId(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>Confirm Redemption</h3>
                <p className="muted">
                  Redeem <strong>{reward.title}</strong> for{" "}
                  <strong>{reward.greenPointsCost} Green Points</strong>?
                </p>
                <div className="modal-actions">
                  <button type="button" className="ghost" onClick={() => setConfirmId(null)}>Cancel</button>
                  <button
                    type="button"
                    className="primary"
                    disabled={actionLoading === reward.rewardItemId}
                    onClick={() => redeemReward(reward.rewardItemId)}
                  >
                    {actionLoading === reward.rewardItemId ? <Loader2 size={14} className="spin" /> : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <ul className="reward-grid">
          {rewards.map((reward) => (
            <li key={reward.rewardItemId} className={reward.affordable ? "reward" : "reward locked"}>
              <p className="cost"><Award size={14} /> {reward.greenPointsCost}</p>
              <h3>{reward.title}</h3>
              <p className="muted">{reward.blurb}</p>
              <div className="reward-foot">
                <button
                  type="button"
                  className="secondary"
                  disabled={!reward.affordable || actionLoading === reward.rewardItemId}
                  onClick={() => setConfirmId(reward.rewardItemId)}
                >
                  {actionLoading === reward.rewardItemId ? (
                    <Loader2 size={14} className="spin" />
                  ) : reward.affordable ? (
                    "Redeem"
                  ) : (
                    `Need ${reward.greenPointsCost - availablePoints} more`
                  )}
                </button>
                {reward.owned > 0 && (
                  <span className="done"><Check size={14} /> {reward.owned} redeemed</span>
                )}
              </div>
              <p className="fine">DEMO_REWARD · No payment or delivery</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
