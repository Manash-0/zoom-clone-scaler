# Zoom Clone — Full-Stack Video Conferencing App

A production-ready video conferencing web application replicating Zoom's core UI, real-time meeting workflows, and WebRTC peer-to-peer video.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14+ (App Router), TypeScript, CSS Modules |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Database** | SQLite via SQLAlchemy ORM, Pydantic v2 schemas |
| **Real-Time** | FastAPI WebSockets for signaling |
| **Media** | WebRTC Mesh P2P, Google STUN (`stun:stun.l.google.com:19302`) |
| **Icons** | Lucide React |

---

## Features

- **Dashboard** — Action cards (New Meeting, Join, Schedule), upcoming/recent meeting lists, live clock, dynamic greeting
- **Pre-Join Preview** — Live camera + mic preview, mute/video toggles, display name input
- **Meeting Room** — Adaptive video grid, real-time in-meeting chat, participants panel with host controls (mute/kick), elapsed timer, copy-invite-link
- **Responsive Design** — Sidebar collapses to icons on tablet, hides on mobile; control bar hides labels on small screens; panels go full-width

---

## Database Schema

```
+------------------+         +------------------+         +--------------------+
|      users       |         |     meetings     |         |    participants    |
+------------------+         +------------------+         +--------------------+
| id (PK)          |<-------1| id (PK)          |<-------1| id (PK)            |
| name             |  Host   | meeting_code(UQ) |  Room   | meeting_id (FK)    |
| email (UQ)       |---N---->| host_id (FK)     |---N---->| user_id (FK, Null) |
| avatar_color     |         | title            |         | display_name       |
| created_at       |         | description      |         | role (host|part)   |
+------------------+         | type             |         | joined_at          |
                             | status           |         | left_at            |
                             | scheduled_start  |         | is_muted           |
                             | duration_minutes |         | is_video_on        |
                             | created_at       |         +--------------------+
                             | started_at       |
                             | ended_at         |
                             +------------------+
                                      | 1
                                      v N
                             +------------------+
                             |  meeting_invites |
                             +------------------+
                             | id (PK)          |
                             | meeting_id (FK)  |
                             | invite_token (UQ)|
                             | created_at       |
                             +------------------+
```

**Relationships**: User→Meetings (1:N host), Meeting→Participants (1:N), Meeting→Invites (1:N). `user_id` in participants is nullable for guest joins.

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+ / npm

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv

# Activate venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

API docs at `http://localhost:8000/docs`.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Deployment

### Frontend → Vercel

1. Push repo to GitHub
2. Import the `frontend/` directory in [Vercel](https://vercel.com)
3. Set environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` — your deployed backend URL (e.g. `https://zoom-clone-backend.onrender.com`)
   - `NEXT_PUBLIC_WS_URL` — WebSocket URL (e.g. `wss://zoom-clone-backend.onrender.com`)

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Point it to the `backend/` directory (or use the `render.yaml` blueprint)
3. Set environment variable:
   - `FRONTEND_URL` — your deployed frontend URL (e.g. `https://zoom-clone.vercel.app`)

The `Procfile` and `render.yaml` are included for one-click setup.

---

## Assumptions & Design Decisions

1. **No authentication** — A default user `Alex Johnson` (user_id=1) is seeded. Guest participants join via display name only.
2. **WebRTC Mesh** — Peer-to-peer with public STUN. No TURN server required for same-network calls; cross-NAT calls may need a TURN server in production.
3. **SQLite** — Auto-initialized on startup with seed data. Swap to PostgreSQL for production by changing the `DATABASE_URL` in `database.py`.
