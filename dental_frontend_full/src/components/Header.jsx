import { Activity, ClipboardList, ScanLine, ShieldCheck, Wifi } from "lucide-react";

export default function Header({ view, onNavigate }) {
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

      <div className="header-right">
        <div className="header-nav">
          <button
            type="button"
            className={`header-nav-btn${view === "scan" ? " active" : ""}`}
            onClick={() => onNavigate("scan")}
          >
            <ScanLine size={14} />
            Scan
          </button>

          <button
            type="button"
            className={`header-nav-btn${view === "questionnaire" ? " active" : ""}`}
            onClick={() => onNavigate("questionnaire")}
          >
            <ClipboardList size={14} />
            Symptom Checker
          </button>
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
      </div>
    </header>
  );
}