import { useEffect, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";

import Header from "./components/Header";
import ImageInput from "./components/ImageInput";
import AnalyzeButton from "./components/AnalyzeButton";
import PrimaryResult from "./components/PrimaryResult";
import DetectionOverlay from "./components/DetectionOverlay";
import ClassifierBreakdown from "./components/ClassifierBreakdown";
import CariesEvidence from "./components/CariesEvidence";
import QualityCard from "./components/QualityCard";
import Disclaimer from "./components/Disclaimer";

import { analyzeImage } from "./services/api";

export default function App() {
  const inputRef = useRef(null);

  const [file, setFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  function setSelectedFile(nextFile) {
    if (!nextFile) return;

    if (
      !nextFile.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image file."
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    const url =
      URL.createObjectURL(
        nextFile
      );

    setFile(nextFile);
    setPreviewUrl(url);
    setResult(null);
    setError("");
  }

  function handleInputChange(
    event
  ) {
    setSelectedFile(
      event.target.files?.[0]
    );

    event.target.value = "";
  }

  function openCamera() {
    if (!inputRef.current)
      return;

    inputRef.current.setAttribute(
      "capture",
      "environment"
    );

    inputRef.current.click();
  }

  function openUploader() {
    if (!inputRef.current)
      return;

    inputRef.current.removeAttribute(
      "capture"
    );

    inputRef.current.click();
  }

  function replaceImage() {
    setResult(null);
    setError("");

    openUploader();
  }

  function reset() {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
  }

  async function submitImage() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await analyzeImage(file);

      setResult(response);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to analyze the image."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <Header />

      <main className="container">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">
              AI-ASSISTED DENTAL SCREENING
            </span>

            <h1>
              A clearer view of your
              <span> oral health.</span>
            </h1>

            <p>
              Capture an intraoral photo or upload
              one from your phone. The system checks
              for possible caries using a localized
              detector and evaluates broader oral
              conditions with a six-class classifier.
            </p>
          </div>

          <div className="hero-card">
            <div className="hero-card-number">
              2
            </div>

            <div>
              <strong>
                AI models working together
              </strong>

              <span>
                Localized caries detection +
                general condition classification
              </span>
            </div>
          </div>
        </section>

        <div className="app-grid">
          <div className="left">
            <ImageInput
              file={file}
              previewUrl={previewUrl}
              onCamera={openCamera}
              onUpload={openUploader}
              onReplace={replaceImage}
              disabled={loading}
              inputRef={inputRef}
              onInputChange={
                handleInputChange
              }
            />

            <AnalyzeButton
              disabled={!file}
              loading={loading}
              onClick={
                submitImage
              }
            />

            {error && (
              <div className="error-box">
                <strong>
                  Analysis failed
                </strong>

                <span>
                  {error}
                </span>

                <button
                  type="button"
                  onClick={reset}
                >
                  <RefreshCcw size={15} />
                  Try again
                </button>
              </div>
            )}

            {!result && !loading && (
              <div className="tips">
                <span className="step-label">
                  PHOTO TIPS
                </span>

                <div className="tip-grid">
                  <div>
                    <strong>
                      Use the rear camera
                    </strong>

                    <span>
                      It usually provides higher
                      resolution.
                    </span>
                  </div>

                  <div>
                    <strong>
                      Keep the teeth in focus
                    </strong>

                    <span>
                      Avoid motion blur and
                      extreme close-ups.
                    </span>
                  </div>

                  <div>
                    <strong>
                      Use even lighting
                    </strong>

                    <span>
                      Avoid strong shadows and
                      overexposure.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="right">
            {loading && (
              <div className="loading-panel panel">
                <div className="loading-ring" />
                <div>
                  <strong>
                    Analyzing your image
                  </strong>

                  <span>
                    Running both screening
                    models...
                  </span>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="empty-result panel">
                <div className="empty-icon">
                  ✦
                </div>

                <span className="step-label">
                  RESULTS
                </span>

                <h2>
                  Your screening result
                  will appear here
                </h2>

                <p>
                  After analysis, the primary
                  result will prioritize a
                  sufficiently confident caries
                  detection. Otherwise the general
                  six-class classifier will be used.
                </p>
              </div>
            )}

            {!loading && result && (
              <>
                <PrimaryResult
                  result={result}
                />

                {previewUrl && (
                  <DetectionOverlay
                    src={previewUrl}
                    width={
                      result.image?.width ||
                      result.image_quality
                        ?.width ||
                      0
                    }
                    height={
                      result.image?.height ||
                      result.image_quality
                        ?.height ||
                      0
                    }
                    detections={
                      result.caries_detections ||
                      []
                    }
                  />
                )}

                <div className="two-col">
                  <CariesEvidence
                    result={result}
                  />

                  <QualityCard
                    quality={
                      result.image_quality
                    }
                  />
                </div>

                <ClassifierBreakdown
                  result={result}
                />

                <Disclaimer />

                <button
                  type="button"
                  className="reset-button"
                  onClick={reset}
                >
                  <RefreshCcw size={16} />
                  Analyze another image
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        Dental Vision · AI-assisted screening prototype
      </footer>
    </div>
  );
}
