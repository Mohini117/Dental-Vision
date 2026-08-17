import {
  Camera,
  ImagePlus,
  RefreshCcw,
  Upload,
} from "lucide-react";

export default function ImageInput({
  file,
  previewUrl,
  onCamera,
  onUpload,
  onReplace,
  disabled,
  inputRef,
  onInputChange,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="step-label">01 · IMAGE</span>
          <h2>Capture or upload</h2>
          <p>
            Use a clear intraoral photo showing the teeth and gums.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="image/*"
        onChange={onInputChange}
      />

      {!previewUrl ? (
        <div className="input-actions">
          <button
            type="button"
            className="input-card primary"
            onClick={onCamera}
            disabled={disabled}
          >
            <div className="input-icon">
              <Camera size={28} />
            </div>

            <div>
              <strong>Take a photo</strong>
              <span>Open the phone rear camera</span>
            </div>
          </button>

          <button
            type="button"
            className="input-card"
            onClick={onUpload}
            disabled={disabled}
          >
            <div className="input-icon secondary">
              <Upload size={28} />
            </div>

            <div>
              <strong>Upload image</strong>
              <span>Choose a saved JPG, PNG or WEBP</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="selected-image">
          <img
            src={previewUrl}
            alt="Selected intraoral"
          />

          <div className="selected-toolbar">
            <div className="selected-file">
              <ImagePlus size={17} />
              <span>{file?.name || "Selected image"}</span>
            </div>

            <button
              type="button"
              className="small-button"
              onClick={onReplace}
              disabled={disabled}
            >
              <RefreshCcw size={15} />
              Replace
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
