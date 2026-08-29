import Link from "next/link";
import { ArrowRight, Leaf, Receipt, ShieldCheck, Sparkles } from "lucide-react";

export default function Page() {
  return (
    <main className="home">
      <header className="topbar">
        <Link href="/" className="brand">
          <Leaf size={22} />
          CarbonLoop
        </Link>
        <nav className="topnav">
          <Link href="/demo">Missions</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="hero-pill">
            <ShieldCheck size={14} /> Synthetic demo · no real data
          </span>
          <h1>
            Play your way to a<em>lighter campus</em>
          </h1>
          <p>
            Complete travel and consumption missions, earn Eco XP and Green Points, and see exactly how each reward was
            calculated. Every number is derived from an append-only ledger — nothing is decorative.
          </p>
          <div className="hero-actions">
            <Link className="primary" href="/demo">
              Start playing <ArrowRight size={16} />
            </Link>
            <Link className="ghost" href="/dashboard">
              View the ledger
            </Link>
          </div>

          <div className="hero-facts">
            <div>
              <h2>
                <Sparkles size={14} /> Real progression
              </h2>
              <p className="muted">
                Levels, XP, streaks, and rank all come from missions you actually complete, saved in this browser.
              </p>
            </div>
            <div>
              <h2>
                <Receipt size={14} /> Auditable rewards
              </h2>
              <p className="muted">
                Each completion shows its baseline, factor version, evidence tier, and avoided CO2e to three decimals.
              </p>
            </div>
            <div>
              <h2>
                <ShieldCheck size={14} /> Honest by design
              </h2>
              <p className="muted">
                A mission that displaces nothing motorised pays Eco XP only and says so. No invented carbon claims.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="game-foot" style={{ padding: "0 20px 32px", justifyContent: "center" }}>
        <span>SIMULATED_DEMO_ONLY · SYNTHETIC_TEST_ONLY · MOCK_DEMO_ONLY</span>
      </footer>
    </main>
  );
}
