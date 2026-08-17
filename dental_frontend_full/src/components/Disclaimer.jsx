import { ShieldCheck } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="disclaimer">
      <ShieldCheck size={17} />

      <div>
        <strong>
          Important
        </strong>

        <span>
          This application provides AI-assisted
          screening, not a medical diagnosis.
          Do not use the result alone to make
          treatment decisions. A qualified dentist
          should evaluate suspected findings.
        </span>
      </div>
    </div>
  );
}
