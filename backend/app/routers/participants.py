from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Meeting, Participant, ParticipantRole, MeetingStatus
from ..schemas import ParticipantCreate, ParticipantPatch, ParticipantResponse

router = APIRouter(prefix="/api", tags=["Participants"])

@router.post("/meetings/{meeting_code}/join", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def join_meeting(meeting_code: str, payload: ParticipantCreate, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # If meeting was scheduled, transition to active on first join
    if meeting.status == MeetingStatus.SCHEDULED:
        meeting.status = MeetingStatus.ACTIVE
        meeting.started_at = datetime.utcnow()
        db.commit()

    # Determine role (if user_id matches host_id -> HOST, else PARTICIPANT)
    role = ParticipantRole.HOST if payload.user_id == meeting.host_id else ParticipantRole.PARTICIPANT

    participant = Participant(
        meeting_id=meeting.id,
        user_id=payload.user_id,
        display_name=payload.display_name,
        role=role,
        is_muted=payload.is_muted if payload.is_muted is not None else False,
        is_video_on=payload.is_video_on if payload.is_video_on is not None else True,
        joined_at=datetime.utcnow()
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)

    return participant

@router.post("/meetings/{meeting_code}/leave")
def leave_meeting(meeting_code: str, participant_id: int, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    participant.left_at = datetime.utcnow()
    db.commit()

    # Check if remaining active participants count is 0
    active_count = db.query(Participant).filter(
        Participant.meeting_id == participant.meeting_id,
        Participant.left_at.is_(None)
    ).count()

    if active_count == 0:
        meeting = db.query(Meeting).filter(Meeting.id == participant.meeting_id).first()
        if meeting and meeting.status == MeetingStatus.ACTIVE:
            meeting.status = MeetingStatus.ENDED
            meeting.ended_at = datetime.utcnow()
            db.commit()

    return {"message": "Left meeting successfully", "participant_id": participant_id}

@router.get("/meetings/{meeting_code}/participants", response_model=List[ParticipantResponse])
def get_participants(meeting_code: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    participants = db.query(Participant).filter(
        Participant.meeting_id == meeting.id,
        Participant.left_at.is_(None)
    ).all()
    return participants

@router.patch("/participants/{id}", response_model=ParticipantResponse)
def update_participant(id: int, payload: ParticipantPatch, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    if payload.is_muted is not None:
        participant.is_muted = payload.is_muted
    if payload.is_video_on is not None:
        participant.is_video_on = payload.is_video_on
    if payload.left_at is not None:
        participant.left_at = payload.left_at

    db.commit()
    db.refresh(participant)
    return participant
