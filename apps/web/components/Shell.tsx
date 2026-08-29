"use client";

import Link from "next/link";
import {
  Award,
  Bike,
  Check,
  Flame,
  Footprints,
  Gift,
  Leaf,
  Lock,
  RotateCcw,
  Salad,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Bus,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

import {
  MISSIONS,
  REWARDS,
  type CompletionOutcome,
  type DerivedGame,
  type Mission,
  campusAggregate,
  leaderboard,
  missionCarbon,
} from "@/lib/game";
import { useGame, type GameApi } from "@/lib/use-game";
import { greenPointsForAvoidedKgCo2e } from "@carbonloop/scoring";

const MISSION_ICONS: Record<Mission["activityType"], ComponentType<{ size?: number }>> = {
  walking: Footprints,
  cycling: Bike,
  shuttle: Bus,
  consumption: Salad,
};

/** Whole kilograms are meaningless at this scale, so show three decimals. */
function kg(value: string): string {
  return Number(value).toFixed(3);
}

/** What a mission is worth before it is played, derived from the same engine that scores it. */
function missionReward(mission: Mission): { points: number; label: string } {
  const result = missionCarbon(mission, "SYNTHETIC_TEST_ONLY_preview", "2026-01-01T00:00:00.000Z");
  if (result === undefined || result.status !== "calculated") {
    return { points: 0, label: "Eco XP only — no CO2e claim" };
  }
  const points = greenPointsForAvoidedKgCo2e(result.avoidedKgCo2e);
  return { points, label: `${points} PTS · ${kg(result.avoidedKgCo2e)} kg CO2e avoided` };
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

function TopBar({ active }: { active: "missions" | "dashboard" }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <Leaf size={22} />
        CarbonLoop
      </Link>
      <nav className="topnav">
        <Link href="/demo" className={active === "missions" ? "on" : undefined}>
          Missions
        </Link>
        <Link href="/dashboard" className={active === "dashboard" ? "on" : undefined}>
          Dashboard
        </Link>
      </nav>
    </header>
  );
}

function TruthBanner() {
  return (
    <p className="truth-banner">
      <ShieldCheck size={14} />
      <span>
        Every figure below is <b>synthetic</b>. Emission factors, journeys, and rewards are simulated for demonstration.
        Nothing here is a real measurement, a carbon credit, an offset, or a cash value.
      </span>
    </p>
  );
}

function Hud({ derived }: { derived: DerivedGame }) {
  const progress = Math.round((derived.xpIntoLevel / derived.xpForNextLevel) * 100);
  return (
    <section className="hud" aria-label="Player progress">
      <div className="hud-level">
        <div className="level-ring" style={{ ["--fill" as string]: `${progress}%` }}>
          <span>{derived.level}</span>
        </div>
        <div>
          <p className="hud-title">{derived.levelTitle}</p>
          <p className="hud-sub">Level {derived.level}</p>
          <div
            className="xp-track"
            role="progressbar"
            aria-valuenow={derived.xpIntoLevel}
            aria-valuemin={0}
            aria-valuemax={derived.xpForNextLevel}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="hud-sub">
            {derived.xpIntoLevel} / {derived.xpForNextLevel} XP to next level
          </p>
        </div>
      </div>
      <dl className="hud-stats">
        <Stat icon={Sparkles} label="Eco XP" value={String(derived.ecoXp)} hint="Lifetime, from completed missions" />
        <Stat
          icon={Award}
          label="Green Points"
          value={String(derived.spendableGreenPoints)}
          hint={`${derived.greenPoints} earned lifetime`}
        />
        <Stat
          icon={TrendingUp}
          label="Avoided CO2e"
          value={`${kg(derived.avoidedKgCo2e)} kg`}
          hint="Synthetic, evidence-tiered"
        />
        <Stat icon={Flame} label="Day streak" value={String(derived.streakDays)} hint="Consecutive mission days" />
      </dl>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="stat">
      <dt>
        <Icon size={14} />
        {label}
      </dt>
      <dd>{value}</dd>
      <p>{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

function ActiveMission({ game }: { game: GameApi }) {
  const run = game.derived.activeRun;
  if (run === undefined) return null;
  const mission = MISSIONS.find((candidate) => candidate.questTemplateId === run.questTemplateId);
  if (mission === undefined) return null;
  const reward = missionReward(mission);
  return (
    <section className="active-card" aria-live="polite">
      <div>
        <p className="eyebrow">Mission in progress</p>
        <h2>{mission.title}</h2>
        <p className="muted">{mission.blurb}</p>
        <p className="chips">
          <span className="chip">+{mission.ecoXp} XP</span>
          <span className="chip">{reward.label}</span>
          <span className="chip">
            Evidence {mission.evidenceTier} · {mission.evidenceSource}
          </span>
        </p>
      </div>
      <button type="button" className="primary" onClick={() => game.complete(run.questRunId)}>
        Log simulated activity
      </button>
    </section>
  );
}

function MissionCard({ mission, game }: { mission: Mission; game: GameApi }) {
  const Icon = MISSION_ICONS[mission.activityType];
  const reward = missionReward(mission);
  const completedCount = game.derived.completedTemplateIds.filter((id) => id === mission.questTemplateId).length;
  const tokenSpent = mission.requiresToken && game.state.usedTokens.length > 0;
  const blocked = game.derived.activeRun !== undefined || tokenSpent;

  return (
    <article className={`mission ${mission.difficulty.toLowerCase()}`}>
      <header>
        <span className="mission-icon">
          <Icon size={20} />
        </span>
        <span className="badge">{mission.difficulty}</span>
      </header>
      <h3>{mission.title}</h3>
      <p className="muted">{mission.blurb}</p>
      <p className="chips">
        <span className="chip strong">+{mission.ecoXp} XP</span>
        <span className={reward.points > 0 ? "chip" : "chip warn"}>{reward.label}</span>
      </p>
      <footer>
        <button
          type="button"
          className="secondary"
          disabled={blocked}
          onClick={() => game.start(mission.questTemplateId)}
        >
          {tokenSpent ? (
            <>
              <Lock size={14} /> Token used
            </>
          ) : (
            "Start mission"
          )}
        </button>
        {completedCount > 0 && (
          <span className="done">
            <Check size={14} /> {completedCount}×
          </span>
        )}
      </footer>
    </article>
  );
}

function CompletionCard({ outcome, onDismiss }: { outcome: CompletionOutcome; onDismiss: () => void }) {
  const carbon = outcome.carbonResult;
  return (
    <section className="completion" role="status">
      <button type="button" className="ghost close" onClick={onDismiss} aria-label="Dismiss result">
        <X size={16} />
      </button>
      <p className="eyebrow">
        {outcome.leveledUpTo === undefined ? "Mission complete" : `Level up — level ${outcome.leveledUpTo}`}
      </p>
      <h2>{outcome.mission.title}</h2>
      <div className="rewards-row">
        <span className="reward-pill">
          <Sparkles size={16} /> +{outcome.ecoXpIssued} Eco XP
        </span>
        {outcome.greenPointsIssued > 0 ? (
          <span className="reward-pill">
            <Award size={16} /> +{outcome.greenPointsIssued} Green Points
          </span>
        ) : (
          <span className="reward-pill muted-pill">
            <Award size={16} /> 0 Green Points
          </span>
        )}
      </div>
      {outcome.noCarbonClaimReason !== undefined && <p className="claim-note">{outcome.noCarbonClaimReason}</p>}
      {carbon !== undefined && carbon.status === "calculated" && (
        <dl className="receipt">
          <div>
            <dt>Baseline</dt>
            <dd>
              {kg(carbon.baselineKgCo2e)} kg · {carbon.baselineFactorSnapshot.activityType} @{" "}
              {carbon.baselineFactorSnapshot.decimalValue} {carbon.baselineFactorSnapshot.factorUnit}
            </dd>
          </div>
          <div>
            <dt>Actual</dt>
            <dd>
              {kg(carbon.actualKgCo2e)} kg · {carbon.actualFactorSnapshot.activityType} @{" "}
              {carbon.actualFactorSnapshot.decimalValue} {carbon.actualFactorSnapshot.factorUnit}
            </dd>
          </div>
          <div>
            <dt>Avoided</dt>
            <dd className="accent">{kg(carbon.avoidedKgCo2e)} kg CO2e</dd>
          </div>
          <div>
            <dt>Evidence tier</dt>
            <dd>
              {carbon.evidenceTier} · {outcome.mission.evidenceSource}
            </dd>
          </div>
          <div>
            <dt>Truth labels</dt>
            <dd>{carbon.truthLabels.join(", ")}</dd>
          </div>
        </dl>
      )}
      <p className="fine">
        Simulated via {outcome.activity.adapterLabel}. Quantity recorded in {outcome.activity.quantityUnit}. No sensor,
        location, or permission was read.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Rewards and leaderboard
// ---------------------------------------------------------------------------

function RewardShelf({ game }: { game: GameApi }) {
  return (
    <section className="block">
      <h2 className="block-title">
        <Gift size={18} /> Mock reward shelf
      </h2>
      <p className="muted">
        Spend Green Points on simulated items. Redemption reserves the item in local state only — no payment, delivery,
        or cash value occurs.
      </p>
      <ul className="reward-grid">
        {REWARDS.map((reward) => {
          const affordable = game.derived.spendableGreenPoints >= reward.greenPointsCost;
          const owned = game.state.redemptions.filter((entry) => entry.rewardItemId === reward.rewardItemId).length;
          return (
            <li key={reward.rewardItemId} className={affordable ? "reward" : "reward locked"}>
              <p className="cost">
                <Award size={14} /> {reward.greenPointsCost}
              </p>
              <h3>{reward.title.replace("SYNTHETIC_TEST_ONLY ", "")}</h3>
              <p className="muted">{reward.blurb}</p>
              <div className="reward-foot">
                <button
                  type="button"
                  className="secondary"
                  disabled={!affordable}
                  onClick={() => game.redeem(reward.rewardItemId)}
                >
                  {affordable ? "Redeem" : `Need ${reward.greenPointsCost - game.derived.spendableGreenPoints} more`}
                </button>
                {owned > 0 && (
                  <span className="done">
                    <Check size={14} /> {owned} reserved
                  </span>
                )}
              </div>
              <p className="fine">{reward.catalogueLabel}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Leaderboard({ ecoXp }: { ecoXp: number }) {
  return (
    <section className="block">
      <h2 className="block-title">
        <Trophy size={18} /> Cohort leaderboard
      </h2>
      <p className="muted">
        Opponents are a fixed synthetic cohort, not real people. Your row is your real Eco XP, ranked against them.
      </p>
      <ol className="board">
        {leaderboard(ecoXp).map((row) => (
          <li key={row.name} className={row.isPlayer ? "me" : undefined}>
            <span className="rank">{row.rank}</span>
            <span className="who">{row.name}</span>
            <span className="xp">{row.ecoXp} XP</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({ game }: { game: GameApi }) {
  const aggregate = campusAggregate(game.state);
  const tiers = ["V1", "V2", "V3", "V4"] as const;
  const maxTier = Math.max(1, ...tiers.map((tier) => aggregate.evidenceQuality[tier]));

  return (
    <>
      <section className="block">
        <h2 className="block-title">
          <TrendingUp size={18} /> Campus aggregate
        </h2>
        <p className="muted">
          Counts only, above a synthetic cohort threshold. No player name, route, or per-person figure is exposed.
        </p>
        <dl className="hud-stats">
          <Stat
            icon={Footprints}
            label="Eligible journeys"
            value={String(aggregate.metrics.syntheticEligibleJourneys)}
            hint="Journeys that issued Green Points"
          />
          <Stat
            icon={Check}
            label="Missions completed"
            value={String(aggregate.metrics.syntheticMissionsCompleted)}
            hint="Including zero-claim missions"
          />
          <Stat
            icon={Leaf}
            label="Avoided CO2e"
            value={`${kg(game.derived.avoidedKgCo2e)} kg`}
            hint="Sum of evidence-backed results"
          />
        </dl>
      </section>

      <section className="block">
        <h2 className="block-title">
          <ShieldCheck size={18} /> Evidence quality
        </h2>
        <p className="muted">
          Real per-tier counts from the score ledger. V1 is issuer-verified, V2 simulated sensor; V3 and V4 are unused
          in this demo.
        </p>
        <ul className="tiers">
          {tiers.map((tier) => (
            <li key={tier}>
              <span className="tier-name">{tier}</span>
              <span className="tier-bar">
                <span style={{ width: `${(aggregate.evidenceQuality[tier] / maxTier) * 100}%` }} />
              </span>
              <span className="tier-count">{aggregate.evidenceQuality[tier]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2 className="block-title">
          <Award size={18} /> Score ledger
        </h2>
        <p className="muted">
          Append-only. Every point in the HUD is derived from these events, never stored directly.
        </p>
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th>Occurred</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Tier</th>
                <th>Activity</th>
                <th>Avoided kg</th>
              </tr>
            </thead>
            <tbody>
              {game.state.events.map((event) => (
                <tr key={event.eventId}>
                  <td>{event.occurredAt.replace("T", " ").slice(0, 19)}</td>
                  <td>{event.type.replace(/_/g, " ")}</td>
                  <td>{"amount" in event ? event.amount : "—"}</td>
                  <td>{"evidenceTier" in event ? event.evidenceTier : "—"}</td>
                  <td>{"activityType" in event ? event.activityType : "—"}</td>
                  <td>{"avoidedKgCo2e" in event ? kg(event.avoidedKgCo2e) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">
          {aggregate.recordLabel} · privacy threshold applied: {String(aggregate.privacyThresholdApplied)}
        </p>
      </section>

      <section className="block">
        <h2 className="block-title">
          <Gift size={18} /> Mock redemptions
        </h2>
        {game.state.redemptions.length === 0 ? (
          <p className="muted">No mock rewards reserved yet.</p>
        ) : (
          <ul className="plain">
            {game.state.redemptions.map((redemption) => {
              const reward = REWARDS.find((candidate) => candidate.rewardItemId === redemption.rewardItemId);
              return (
                <li key={redemption.redemptionId}>
                  <b>{reward?.title ?? redemption.rewardItemId}</b> — {redemption.state} ·{" "}
                  {redemption.redeemedAt.slice(0, 10)} · {reward?.greenPointsCost ?? 0} points
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function Shell({ dashboard = false }: { dashboard?: boolean }) {
  const game = useGame();

  return (
    <main className="game">
      <TopBar active={dashboard ? "dashboard" : "missions"} />
      <div className="game-body">
        <TruthBanner />
        <Hud derived={game.derived} />

        {game.notice !== null && (
          <p className="notice" role="alert">
            {game.notice}
          </p>
        )}

        {dashboard ? (
          <Dashboard game={game} />
        ) : (
          <>
            {game.lastCompletion !== null && (
              <CompletionCard outcome={game.lastCompletion} onDismiss={game.dismissCompletion} />
            )}
            <ActiveMission game={game} />
            <section className="block">
              <h2 className="block-title">
                <Sparkles size={18} /> Mission board
              </h2>
              <p className="muted">
                One mission runs at a time. Rewards shown are computed by the same carbon engine that scores the result,
                so the board cannot promise more than it pays.
              </p>
              <div className="mission-grid">
                {MISSIONS.map((mission) => (
                  <MissionCard key={mission.questTemplateId} mission={mission} game={game} />
                ))}
              </div>
            </section>
            <RewardShelf game={game} />
            <Leaderboard ecoXp={game.derived.ecoXp} />
          </>
        )}

        <footer className="game-foot">
          <button type="button" className="ghost" onClick={game.reset}>
            <RotateCcw size={14} /> Reset this browser&apos;s save
          </button>
          <span>SIMULATED_DEMO_ONLY · SYNTHETIC_TEST_ONLY · MOCK_DEMO_ONLY</span>
        </footer>
      </div>
    </main>
  );
}
