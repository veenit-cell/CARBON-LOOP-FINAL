import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  Calculator,
  Flame,
  Gift,
  Leaf,
  MapPin,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export default function Page() {
  return (
    <main className="landing">
      {/* ---------- Topbar ---------- */}
      <header className="topbar">
        <Link href="/" className="brand">
          <Leaf size={22} />
          CarbonLoop
        </Link>
        <nav className="topnav">
          <Link href="/login">Login</Link>
          <Link href="/signup" className="primary nav-cta">
            Get Started
          </Link>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div>
          <span className="hero-pill">
            <Zap size={14} /> Campus decarbonization, gamified
          </span>
          <h1>
            Play your way to a<em>lighter campus</em>
          </h1>
          <p>
            Complete green missions, track your carbon impact with verified emission factors,
            earn points, and redeem real campus rewards. Every gram of CO₂e avoided is
            calculated server-side — nothing is decorative.
          </p>
          <div className="hero-actions">
            <Link className="primary" href="/signup">
              Start Your Journey <ArrowRight size={16} />
            </Link>
            <Link className="ghost" href="/login">
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- How It Works ---------- */}
      <section className="landing-section">
        <h2 className="section-title">
          <Target size={22} /> How It Works
        </h2>
        <p className="section-sub">Three steps to start making an impact</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Choose a Mission</h3>
            <p className="muted">
              Pick from walking, cycling, or shuttle missions. Each shows its exact
              CO₂e impact and point reward before you start.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Complete & Track</h3>
            <p className="muted">
              Log your green activity. Our carbon engine calculates avoided emissions
              using verified emission factors — no guesswork.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Earn & Redeem</h3>
            <p className="muted">
              Collect Eco XP and Green Points. Level up, maintain streaks, and
              redeem points for campus rewards.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Features Grid ---------- */}
      <section className="landing-section">
        <h2 className="section-title">
          <Sparkles size={22} /> Everything You Need
        </h2>
        <p className="section-sub">A complete platform for campus sustainability</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Target size={24} />
            </div>
            <h3>Green Missions</h3>
            <p className="muted">
              Walk, cycle, or take the shuttle instead of driving. Each mission has clear
              requirements and transparent rewards.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon green">
              <Calculator size={24} />
            </div>
            <h3>Carbon Calculator</h3>
            <p className="muted">
              Server-backed calculations using verified emission factors from the factor
              registry. Every result is auditable.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon amber">
              <Award size={24} />
            </div>
            <h3>Points & Levels</h3>
            <p className="muted">
              Earn Eco XP for every mission and Green Points for verified carbon savings.
              Level up from Seedling to Climate Steward.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon purple">
              <Gift size={24} />
            </div>
            <h3>Campus Rewards</h3>
            <p className="muted">
              Redeem Green Points for canteen vouchers, campus merchandise, and more.
              All redemptions are processed atomically server-side.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <BarChart3 size={24} />
            </div>
            <h3>Impact Dashboard</h3>
            <p className="muted">
              Track your daily, weekly, and monthly carbon savings. See your streak,
              achievements, and contribution to campus goals.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon green">
              <Shield size={24} />
            </div>
            <h3>Honest by Design</h3>
            <p className="muted">
              No invented carbon claims. Missions that don't displace motorised travel
              earn Eco XP only and say so transparently.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Impact Stats ---------- */}
      <section className="landing-section impact-section">
        <h2 className="section-title">
          <TrendingUp size={22} /> Campus Impact
        </h2>
        <p className="section-sub">Join the movement towards a sustainable campus</p>
        <div className="impact-grid">
          <div className="impact-card">
            <Leaf size={28} />
            <span className="impact-value">Evidence-Based</span>
            <span className="impact-label">Carbon Calculations</span>
          </div>
          <div className="impact-card">
            <Flame size={28} />
            <span className="impact-value">Gamified</span>
            <span className="impact-label">Streak & Level System</span>
          </div>
          <div className="impact-card">
            <Users size={28} />
            <span className="impact-value">Campus-Wide</span>
            <span className="impact-label">Leaderboards & Teams</span>
          </div>
          <div className="impact-card">
            <MapPin size={28} />
            <span className="impact-value">Transparent</span>
            <span className="impact-label">Append-Only Ledger</span>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="cta-section">
        <h2>Ready to reduce your carbon footprint?</h2>
        <p className="muted">
          Join CarbonLoop and start making a real, measurable impact on campus sustainability.
        </p>
        <Link className="primary" href="/signup">
          Start Your Journey <ArrowRight size={16} />
        </Link>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Leaf size={18} />
            <span>CarbonLoop</span>
          </div>
          <p className="footer-tagline">
            Evidence-backed campus decarbonization platform
          </p>
          <div className="footer-links">
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
            <Link href="/demo">Demo</Link>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} CarbonLoop. All emission factors are synthetic for demonstration purposes.
          </p>
        </div>
      </footer>
    </main>
  );
}
