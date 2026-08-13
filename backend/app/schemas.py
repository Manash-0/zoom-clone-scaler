from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from .models import MeetingType, MeetingStatus, ParticipantRole

class UserBase(BaseModel):
    name: str
    email: str
    avatar_color: Optional[str] = "#0E71EB"

class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ParticipantBase(BaseModel):
    display_name: str
    is_muted: Optional[bool] = False
    is_video_on: Optional[bool] = True

class ParticipantCreate(ParticipantBase):
    user_id: Optional[int] = None

class ParticipantPatch(BaseModel):
    is_muted: Optional[bool] = None
    is_video_on: Optional[bool] = None
    left_at: Optional[datetime] = None

class ParticipantResponse(ParticipantBase):
    id: int
    meeting_id: int
    user_id: Optional[int] = None
    role: ParticipantRole
    joined_at: datetime
    left_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MeetingCreateInstant(BaseModel):
    title: Optional[str] = "Instant Meeting"
    description: Optional[str] = None

class MeetingCreateSchedule(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_start: datetime
    duration_minutes: int = 30

class MeetingResponse(BaseModel):
    id: int
    meeting_code: str
    host_id: int
    title: str
    description: Optional[str] = None
    type: MeetingType
    status: MeetingStatus
    scheduled_start: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MeetingDetailResponse(MeetingResponse):
    host: UserResponse
    participants: List[ParticipantResponse] = []

    model_config = ConfigDict(from_attributes=True)
