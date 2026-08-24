# Dental Vision — React Frontend

This is the complete React/Vite frontend for the Dental Vision FastAPI backend.

## Project structure

```text
dental_frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── AnalyzeButton.jsx
│   │   ├── CariesEvidence.jsx
│   │   ├── ClassifierBreakdown.jsx
│   │   ├── DetectionOverlay.jsx
│   │   ├── Disclaimer.jsx
│   │   ├── Header.jsx
│   │   ├── ImageInput.jsx
│   │   ├── PrimaryResult.jsx
│   │   └── QualityCard.jsx
│   ├── services/
│   │   └── api.js
│   ├── utils/
│   │   └── result.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

## Install

```bash
npm install
```

## Start backend

From your FastAPI backend:

```bash
python run.py
```

Backend:

```text
http://127.0.0.1:8000
```

## Start React

```bash
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

## Mobile testing

The frontend Vite server binds to:

```text
0.0.0.0:5173
```

The FastAPI backend binds to:

```text
0.0.0.0:8000
```

Put your phone and laptop on the same Wi-Fi.

On Windows run:

```bash
ipconfig
```

Find the laptop's IPv4 address, for example:

```text
192.168.1.10
```

Open on the phone:

```text
http://192.168.1.10:5173
```

The Vite development proxy sends:

```text
/api/predict
```

to:

```text
http://127.0.0.1:8000/api/predict
```

If your frontend and backend are hosted separately, set:

```env
VITE_API_BASE_URL=http://192.168.1.10:8000
```

## Prediction arbitration

The UI uses the shared `DiagnosisResult` arbitration contract as the final decision.

Decision order:

```text
1. Image quality
2. Detector and classifier agreement
3. One confident model, with detector preference for localized conditions
4. Healthy only when both models support it
5. Uncertain when no condition clears its threshold
```

Therefore:

```text
Localized detector finding
    ↓
Primary UI result = Possible Caries
```

The classifier remains available as non-decisive supporting evidence.

Example:

```json
{
  "status": "possible_caries",
  "screening": {
    "primary_condition": "Possible Caries",
    "confidence": 0.826,
    "status": "possible_caries"
  },
  "classifier": {
    "top_prediction": "Ulcers",
    "confidence": 0.370
  }
}
```

UI:

```text
PRIMARY RESULT
Possible Caries
82.6%

SUPPORTING CLASSIFIER
Ulcers
37.0%
```

The frontend does not overwrite one model's raw output with the other.

## API contract

The frontend expects:

```text
POST /api/predict
```

with multipart form field:

```text
file
```

It reads:

```text
status
screening
classifier
caries_detected
caries_detections
image_quality
processing_time_ms
message
```

## Important medical UX

The application deliberately uses:

- Possible Caries
- Screening result
- Uncertain
- Professional assessment recommended

It does not present model output as a definitive diagnosis.
