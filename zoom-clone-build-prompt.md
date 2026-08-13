# Build Prompt: Zoom Clone (Full-Stack Assignment)

Copy everything below into your AI coding tool (Claude Code, Cursor, etc.) as the initial instruction. Work through it phase by phase — don't ask it to do everything in one shot.

---

## PROJECT BRIEF

Build a full-stack video conferencing web app that clones Zoom's UI, UX, and core workflows.

**Stack (fixed, do not substitute):**
- Frontend: Next.js 14+ single page application
- Backend: Python 3.11+, FastAPI
- Database: SQLite
- Real-time signaling: FastAPI WebSockets
- Video/audio: WebRTC (peer-to-peer, using native `RTCPeerConnection`, no paid SDK)
- No authentication — assume a single default logged-in user (seed one `users` row, hardcode `current_user_id = 1` on the backend for now)

**Non-negotiables:**
- UI must visually resemble Zoom: navy/blue (#0E71EB / #2D8CFF family) accents, white cards, rounded corners, left-aligned sidebar nav, clean sans-serif (Inter), generous whitespace, subtle shadows.
- Every core feature (below) must work end-to-end, not just render as UI.
- Code must be modular: separate routers/services on backend, separate reusable components on frontend. No 800-line files.
- Must include a README with setup steps, stack summary, schema diagram/description, and assumptions.
- Must seed the DB with sample users, a few past "recent" meetings, and 2-3 upcoming scheduled meetings.

---

## DATABASE SCHEMA (design in SQLAlchemy models, adjust as needed but keep these entities)

```
users
  id (PK)
  name
  email
  avatar_color (for initials avatar)
  created_at

meetings
  id (PK)
  meeting_code (unique, e.g. "123-456-789", human-shareable)
  host_id (FK -> users.id)
  title
  description
  type (enum: instant | scheduled)
  status (enum: scheduled | active | ended)
  scheduled_start (nullable datetime)
  duration_minutes (nullable)
  created_at
  started_at (nullable)
  ended_at (nullable)

participants
  id (PK)
  meeting_id (FK -> meetings.id)
  user_id (nullable FK -> users.id)   -- nullable to allow guest joins
  display_name
  role (enum: host | participant)
  joined_at
  left_at (nullable)
  is_muted (bool)
  is_video_on (bool)

meeting_invites (optional but nice: tracks the shareable link separately from meeting_code)
  id (PK)
  meeting_id (FK)
  invite_token (unique)
  created_at
```

Relationships: one host (user) -> many meetings; one meeting -> many participants. Explain this relationship clearly in the README.

---

## BACKEND: FastAPI (build in this order)

1. **Project setup**: `app/main.py`, `app/database.py` (SQLite engine + session), `app/models.py` (SQLAlchemy models above), `app/schemas.py` (Pydantic request/response models), `app/seed.py` (seed script).
2. **Routers** (separate files under `app/routers/`):
   - `meetings.py`:
     - `POST /api/meetings/instant` → create instant meeting, return meeting_code + join link
     - `POST /api/meetings/schedule` → create scheduled meeting (title, description, date/time, duration)
     - `GET /api/meetings/upcoming` → list scheduled, not-yet-started meetings for current user
     - `GET /api/meetings/recent` → list ended meetings for current user
     - `GET /api/meetings/{meeting_code}` → validate meeting exists, return details (used by Join flow)
     - `DELETE /api/meetings/{id}` → cancel a scheduled meeting
   - `participants.py`:
     - `POST /api/meetings/{meeting_code}/join` → body: display_name → creates participant row, returns participant_id + meeting info
     - `POST /api/meetings/{meeting_code}/leave`
     - `GET /api/meetings/{meeting_code}/participants`
     - `PATCH /api/participants/{id}` → toggle mute/video, host can remove others
   - `ws.py`:
     - `WS /ws/meetings/{meeting_code}` → signaling channel: broadcast join/leave events and relay WebRTC offer/answer/ICE candidates between participants in the same meeting room (use an in-memory dict of `meeting_code -> list[WebSocket]`)
3. CORS enabled for the Next.js dev origin.
4. Run with `uvicorn app.main:app --reload`.

---

## FRONTEND: Next.js (build in this order)

**Pages (App Router):**
- `/` — Dashboard
  - Top navbar: Zoom-style logo/wordmark left, profile avatar + settings icon right (placeholders, non-functional is fine)
  - Three primary action buttons: "New Meeting", "Join Meeting", "Schedule Meeting" (large, icon + label, Zoom's card-button style)
  - "Upcoming Meetings" section: cards showing title, date/time, duration, Copy Link / Start buttons
  - "Recent Meetings" section: list of past meetings with date and duration
  - "New Meeting" → POST to `/api/meetings/instant`, then router.push to `/meeting/[code]`
  - "Join Meeting" → opens modal: input Meeting ID or paste link + display name → validates via GET, then navigates to `/meeting/[code]?name=...`
  - "Schedule Meeting" → opens modal/form: title, description, date picker, time picker, duration dropdown → POST, refresh upcoming list
- `/meeting/[code]` — Pre-join screen (if no `?name=` yet): camera preview (getUserMedia), display name input, mute/video toggle, "Join now" button
- `/meeting/[code]/room` (or same route, conditional render) — Meeting room:
  - Video grid (self + remote participants via WebRTC), auto-adjusting grid layout
  - Bottom control bar (Zoom-style): Mute/Unmute, Start/Stop Video, Participants panel toggle, Chat placeholder icon, Leave/End Meeting (red), Invite button (copies link)
  - Participants side panel: list of participants, host sees "Mute" / "Remove" controls next to each
  - Meeting info: meeting code + elapsed timer top-left

**Components (reusable, in `components/`):** `Navbar`, `DashboardActionButton`, `MeetingCard`, `ScheduleMeetingModal`, `JoinMeetingModal`, `VideoTile`, `ControlBar`, `ParticipantsPanel`.

**WebRTC:** implement a small hook `useWebRTC(meetingCode, displayName)` that:
- opens the WebSocket to `/ws/meetings/{code}`
- on new peer join, creates an `RTCPeerConnection`, exchanges offer/answer/ICE through the socket
- attaches local/remote MediaStreams to video elements
- use a public STUN server (e.g. `stun:stun.l.google.com:19302`) — no TURN needed for the assignment

**API client:** central `lib/api.ts` with typed fetch wrappers for every backend endpoint — don't scatter raw fetch calls through components.

---

## BUILD PHASES (tell the AI to do these as separate steps, review between each)

1. Scaffold both apps (Next.js + FastAPI), get "hello world" running on both, confirm CORS works.
2. Backend: models, schemas, seed script, run migrations, verify seeded data via `/docs` (FastAPI Swagger UI).
3. Backend: implement meetings + participants routers, test all endpoints via Swagger before touching frontend.
4. Frontend: Dashboard UI with static/mock data, matching Zoom visual style.
5. Frontend: wire Dashboard to real API (instant/join/schedule flows working end-to-end, no video yet).
6. Backend: WebSocket signaling endpoint.
7. Frontend: pre-join screen + camera preview + WebRTC hook + meeting room grid.
8. Frontend: control bar functionality (mute/video toggle updates backend + local stream), participants panel, host remove/mute-all.
9. Polish: responsive breakpoints, loading states, error states (invalid meeting code), empty states (no upcoming meetings).
10. README + seed data + final pass comparing side-by-side against real Zoom screenshots.

---

## DELIVERABLES TO REMIND THE AI ABOUT AT THE END

- `README.md` with: setup instructions (backend venv + `pip install -r requirements.txt` + `uvicorn`, frontend `npm install` + `npm run dev`), tech stack list, schema explanation, assumptions (no auth, single seeded user, STUN-only WebRTC, etc.)
- `.gitignore` covering `node_modules`, `__pycache__`, `*.db`, `.env`
- Confirm the whole thing runs from a clean clone with only the README steps

---

## Instruction to the AI tool

Work through the phases in order. After each phase, show me what changed and wait for confirmation before moving to the next phase. Ask me before making any architectural decision not specified above (e.g., state management library, exact WebRTC signaling message format).
