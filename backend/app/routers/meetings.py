import random
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Meeting, User, Participant, MeetingType, MeetingStatus, ParticipantRole
from ..schemas import MeetingResponse, MeetingDetailResponse, MeetingCreateInstant, MeetingCreateSchedule

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

# Default current user ID per project spec
CURRENT_USER_ID = 1

def generate_unique_code(db: Session) -> str:
    while True:
        code = f"{random.randint(100,999)}-{random.randint(100,999)}-{random.randint(100,999)}"
        existing = db.query(Meeting).filter(Meeting.meeting_code == code).first()
        if not existing:
            return code

@router.post("/instant", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(payload: MeetingCreateInstant = MeetingCreateInstant(), db: Session = Depends(get_db)):
    host = db.query(User).filter(User.id == CURRENT_USER_ID).first()
    if not host:
        raise HTTPException(status_code=404, detail="Default host user not found")

    meeting_code = generate_unique_code(db)
    now = datetime.utcnow()

    meeting = Meeting(
        meeting_code=meeting_code,
        host_id=CURRENT_USER_ID,
        title=payload.title or "Instant Meeting",
        description=payload.description,
        type=MeetingType.INSTANT,
        status=MeetingStatus.ACTIVE,
        started_at=now
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # Add host as initial participant
    host_participant = Participant(
        meeting_id=meeting.id,
        user_id=CURRENT_USER_ID,
        display_name=host.name,
        role=ParticipantRole.HOST,
        is_muted=False,
        is_video_on=True
    )
    db.add(host_participant)
    db.commit()

    return meeting

@router.post("/schedule", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def schedule_meeting(payload: MeetingCreateSchedule, db: Session = Depends(get_db)):
    host = db.query(User).filter(User.id == CURRENT_USER_ID).first()
    if not host:
        raise HTTPException(status_code=404, detail="Default host user not found")

    meeting_code = generate_unique_code(db)

    meeting = Meeting(
        meeting_code=meeting_code,
        host_id=CURRENT_USER_ID,
        title=payload.title,
        description=payload.description,
        type=MeetingType.SCHEDULED,
        status=MeetingStatus.SCHEDULED,
        scheduled_start=payload.scheduled_start,
        duration_minutes=payload.duration_minutes
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

@router.get("/upcoming", response_model=List[MeetingResponse])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).filter(
        Meeting.host_id == CURRENT_USER_ID,
        Meeting.status != MeetingStatus.ENDED
    ).order_by(Meeting.scheduled_start.asc(), Meeting.created_at.desc()).all()
    return meetings

@router.get("/recent", response_model=List[MeetingResponse])
def get_recent_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).filter(
        Meeting.host_id == CURRENT_USER_ID,
        Meeting.status == MeetingStatus.ENDED
    ).order_by(Meeting.ended_at.desc()).all()
    return meetings

@router.get("/{meeting_code}", response_model=MeetingDetailResponse)
def get_meeting_details(meeting_code: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_meeting(id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    db.delete(meeting)
    db.commit()
    return None
