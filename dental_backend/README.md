# Dental Screening Backend

FastAPI backend for the dental intraoral screening prototype.

## Models

Place the trained models here:

```text
models/
├── multiclass/
│   ├── dental_mobilenetv3_final.keras
│   └── metadata.json
│
└── caries/
    └── best.pt
```

The six-class classifier predicts:

- Calculus
- Caries
- Gingivitis
- Ulcers
- Tooth Discoloration
- Hypodontia

The YOLO model detects:

- `primary_caries`
- `permanent_caries`

## Run

From the `backend` directory:

```bash
pip install -r requirements.txt
python run.py
```

The server binds to:

```text
0.0.0.0:8000
```

Laptop browser:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Test from phone

Put the phone and laptop on the same Wi-Fi network.

On Windows:

```bash
ipconfig
```

Find the laptop's IPv4 address, for example:

```text
192.168.1.10
```

Then open on the phone:

```text
http://192.168.1.10:8000/docs
```

or:

```text
http://192.168.1.10:8000
```

`0.0.0.0` is the server bind address. It is not the address to type into the phone.

Windows Firewall may need to allow Python/Uvicorn to accept incoming connections on port 8000.

## API

### Health

```http
GET /api/health
```

### Prediction

```http
POST /api/predict
Content-Type: multipart/form-data
file=<image>
```

Example with curl:

```bash
curl -X POST \
  -F "file=@test.jpg" \
  http://127.0.0.1:8000/api/predict
```

## Important

This is a research/screening prototype, not a diagnostic device.

The Keras classifier is intentionally used for the first backend implementation because its evaluated performance is substantially more reliable than the current INT8 classifier export.

The caries YOLO `.pt` model is also used first because its detections have already been verified. The caries TFLite export should only be integrated after its post-processing is validated against the `.pt` model.
