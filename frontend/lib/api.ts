const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
  created_at: string;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  host_id: number;
  title: string;
  description?: string;
  type: 'instant' | 'scheduled';
  status: 'scheduled' | 'active' | 'ended';
  scheduled_start?: string;
  duration_minutes?: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

export interface Participant {
  id: number;
  meeting_id: number;
  user_id?: number;
  display_name: string;
  role: 'host' | 'participant';
  joined_at: string;
  left_at?: string;
  is_muted: boolean;
  is_video_on: boolean;
}

export interface MeetingDetails extends Meeting {
  host: User;
  participants: Participant[];
}

export interface ScheduleMeetingPayload {
  title: string;
  description?: string;
  scheduled_start: string;
  duration_minutes: number;
}

export interface JoinMeetingPayload {
  display_name: string;
  user_id?: number;
  is_muted?: boolean;
  is_video_on?: boolean;
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `HTTP error ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  createInstantMeeting: (title?: string, description?: string) =>
    fetchJson<Meeting>('/api/meetings/instant', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),

  scheduleMeeting: (data: ScheduleMeetingPayload) =>
    fetchJson<Meeting>('/api/meetings/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUpcomingMeetings: () =>
    fetchJson<Meeting[]>('/api/meetings/upcoming'),

  getRecentMeetings: () =>
    fetchJson<Meeting[]>('/api/meetings/recent'),

  getMeetingDetails: (code: string) =>
    fetchJson<MeetingDetails>(`/api/meetings/${code}`),

  cancelMeeting: (id: number) =>
    fetchJson<void>(`/api/meetings/${id}`, {
      method: 'DELETE',
    }),

  joinMeeting: (code: string, payload: JoinMeetingPayload) =>
    fetchJson<Participant>(`/api/meetings/${code}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  leaveMeeting: (code: string, participantId: number) =>
    fetchJson<{ message: string }>(`/api/meetings/${code}/leave?participant_id=${participantId}`, {
      method: 'POST',
    }),

  getParticipants: (code: string) =>
    fetchJson<Participant[]>(`/api/meetings/${code}/participants`),

  updateParticipant: (id: number, payload: Partial<{ is_muted: boolean; is_video_on: boolean; left_at: string }>) =>
    fetchJson<Participant>(`/api/participants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
