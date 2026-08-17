import { ArrowRight, LoaderCircle } from "lucide-react";

export default function AnalyzeButton({
  disabled,
  loading,
  onClick,
}) {
  return (
    <button
      type="button"
      className="analyze-button"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <LoaderCircle className="spin" size={19} />
          Analyzing image...
        </>
      ) : (
        <>
          Analyze image
          <ArrowRight size={19} />
        </>
      )}
    </button>
  );
}
