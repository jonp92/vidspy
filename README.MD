# GarnetOne

**GarnetOne** is a modular, open platform for IP camera management, recording, and AI-powered video intelligence. It consists of three main components:

- **GarnetScribe**: Lightweight NVR system for recording and serving video.
- **GarnetView**: Camera management system with a browser-based UI.
- **GarnetVision**: AI-powered alerting engine using computer vision.

---

## Components

### I. GarnetScribe (NVR - Network Video Recorder)

**Purpose**: Capture, store, and stream video feeds from IP cameras.

#### Features:
- RTSP ingest with FFmpeg or OpenCV.
- MJPEG and/or HLS stream endpoints for browser access.
- Ring buffer or segmented recording (e.g., 24h or motion-triggered).
- Time-based or event-based video retrieval API.
- Disk quota management (FIFO delete when full).
- Storage backend: local disk, NAS, or S3-compatible object storage.

#### Tech Stack:
- Python (Flask or FastAPI), FFmpeg, OpenCV
- Optional: Redis or ZeroMQ for internal frame/event messaging
- Media storage: raw video + metadata in SQLite/PostgreSQL

---

### II. GarnetView (CMS - Camera Management System)

**Purpose**: Configure and manage cameras, view live feeds, and handle playback.

#### Features:
- Web interface for onboarding/configuring cameras (RTSP URL, name, groups)
- Live view dashboard (grid/single view)
- On-demand playback through GarnetScribe
- User authentication and role-based access control
- Health/status monitoring for cameras
- Mobile-friendly interface

#### Tech Stack:
- Frontend: React.js or Vue.js
- Backend: Python (Flask/FastAPI)
- Auth: JWT-based login or session tokens
- Persistent config store: PostgreSQL or SQLite

---

### III. GarnetVision (AI-based Vision + Alerting Engine)

**Purpose**: Perform AI inference on video feeds for smart alerting and analytics.

#### Features:
- Frame ingestion from GarnetScribe (stream or file)
- Zone-based and object-specific detection (e.g., person, vehicle, etc.)
- Detection logic (e.g., loitering, motion, cross-line detection)
- Event snapshots with metadata
- Notifications via webhook, MQTT, or email

#### Tech Stack:
- Python (OpenCV, PyTorch, ONNX)
- Optional: GPU inference with Triton Inference Server
- Alerts stored in PostgreSQL or delivered via a message queue (Redis/MQTT)

---

## Integration & Architecture

- RESTful APIs connect GarnetScribe, GarnetView, and GarnetVision.
- Optional message bus (Redis Pub/Sub or MQTT) for live events.
- GarnetScribe exposes MJPEG/HLS streams for GarnetView and external consumers.
- GarnetVision subscribes to selected video feeds and returns alerts to GarnetView.

---

## Deployment

- Docker Compose setup planned (WIP).
- Reverse proxy with Nginx or Traefik.
- Persistent storage volumes for video and database.
- Separate worker or GPU node(s) for AI.

---

## Roadmap

- [ ] Add multi-camera layout in GarnetView
- [ ] Motion-based recording in GarnetScribe
- [ ] Web-based alert dashboard in GarnetVision
- [ ] S3 storage support
- [ ] Multi-user permission model

---

## License

MIT License (or your preferred license)

---

## Authors

Developed and maintained by Jonathan Pressler.

---

## Contributing

Pull requests are welcome! Please open an issue first to discuss any major changes.