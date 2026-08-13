import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import User, Meeting, Participant, MeetingType, MeetingStatus, ParticipantRole

def generate_meeting_code():
    part1 = random.randint(100, 999)
    part2 = random.randint(100, 999)
    part3 = random.randint(100, 999)
    return f"{part1}-{part2}-{part3}"

def seed_database(db: Session = None):
    close_session = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_session = True

    try:
        # Check if default user exists
        default_user = db.query(User).filter(User.id == 1).first()
        if not default_user:
            default_user = User(
                id=1,
                name="Alex Johnson",
                email="alex@zoomclone.local",
                avatar_color="#0E71EB"
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            print("[Seed] Created default user: Alex Johnson (ID: 1)")

        # Check existing meetings
        meeting_count = db.query(Meeting).count()
        if meeting_count == 0:
            now = datetime.utcnow()

            # Seed Past / Recent Meetings
            recent_1 = Meeting(
                meeting_code="482-910-384",
                host_id=1,
                title="Product Architecture Review",
                description="Sprint review for video conferencing module",
                type=MeetingType.SCHEDULED,
                status=MeetingStatus.ENDED,
                scheduled_start=now - timedelta(days=2, hours=3),
                duration_minutes=45,
                created_at=now - timedelta(days=3),
                started_at=now - timedelta(days=2, hours=3),
                ended_at=now - timedelta(days=2, hours=2, minutes=15)
            )
            recent_2 = Meeting(
                meeting_code="739-105-842",
                host_id=1,
                title="Weekly Sync - Frontend Team",
                description="Discussion on CSS modules and WebRTC grid",
                type=MeetingType.INSTANT,
                status=MeetingStatus.ENDED,
                scheduled_start=None,
                duration_minutes=30,
                created_at=now - timedelta(days=1, hours=5),
                started_at=now - timedelta(days=1, hours=5),
                ended_at=now - timedelta(days=1, hours=4, minutes=30)
            )

            # Seed Upcoming Scheduled Meetings
            upcoming_1 = Meeting(
                meeting_code="123-456-789",
                host_id=1,
                title="Design System & UI Polish",
                description="Reviewing Zoom dark theme and component library",
                type=MeetingType.SCHEDULED,
                status=MeetingStatus.SCHEDULED,
                scheduled_start=now + timedelta(hours=4),
                duration_minutes=60,
                created_at=now - timedelta(hours=2)
            )
            upcoming_2 = Meeting(
                meeting_code="987-654-321",
                host_id=1,
                title="Client Demo & Walkthrough",
                description="Full end-to-end video streaming demo",
                type=MeetingType.SCHEDULED,
                status=MeetingStatus.SCHEDULED,
                scheduled_start=now + timedelta(days=1, hours=2),
                duration_minutes=45,
                created_at=now - timedelta(hours=1)
            )
            upcoming_3 = Meeting(
                meeting_code="555-019-283",
                host_id=1,
                title="All Hands Engineering Q3",
                description="Quarterly planning and project roadmap",
                type=MeetingType.SCHEDULED,
                status=MeetingStatus.SCHEDULED,
                scheduled_start=now + timedelta(days=3),
                duration_minutes=90,
                created_at=now
            )

            db.add_all([recent_1, recent_2, upcoming_1, upcoming_2, upcoming_3])
            db.commit()

            print("[Seed] Seeded sample past and upcoming meetings successfully.")

    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding database: {e}")
    finally:
        if close_session:
            db.close()

if __name__ == "__main__":
    seed_database()
