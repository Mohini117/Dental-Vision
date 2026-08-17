import { Activity, ShieldCheck, Wifi } from "lucide-react";

export default function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">
          <Activity size={22} />
        </div>

        <div>
          <div className="brand-title">Dental Vision</div>
          <div className="brand-subtitle">
            AI-assisted intraoral screening
          </div>
        </div>
      </div>

      <div className="header-status">
        <div className="status-chip">
          <Wifi size={14} />
          Local AI
        </div>

        <div className="status-chip safe">
          <ShieldCheck size={14} />
          Screening only
        </div>
      </div>
    </header>
  );
}
