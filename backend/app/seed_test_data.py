from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import JobIdentity, JobProfile, User
from app.models import JobIdentityCreateRequest, JobProfileCreateRequest
from app.identity_service import create_identity
from app.profile_service import create_profile


TEST_IDENTITY_NAME = "Test Identity"
TEST_PROFILE_EMAIL = "test.profile@example.com"


def seed_test_identity_profile(db: Session) -> None:
    """Create a linked test identity and profile if they do not exist yet."""
    existing_identity = db.scalar(
        select(JobIdentity).where(JobIdentity.name == TEST_IDENTITY_NAME).limit(1)
    )
    if existing_identity is not None:
        existing_profile = db.scalar(
            select(JobProfile)
            .where(
                JobProfile.identity_id == existing_identity.id,
                JobProfile.email == TEST_PROFILE_EMAIL,
            )
            .limit(1)
        )
        if existing_profile is not None:
            return

    bidder = db.scalar(
        select(User).where(User.username == "joy").limit(1)
    ) or db.scalar(select(User).where(User.username == "admin").limit(1))
    if bidder is None:
        return

    if existing_identity is None:
        identity = create_identity(
            db,
            JobIdentityCreateRequest(
                name=TEST_IDENTITY_NAME,
                country="United States",
                address="123 Test Street",
                city_state="Test City, TS",
                zipcode="12345",
                linkedin="https://linkedin.com/in/test-identity",
                github="https://github.com/test-identity",
            ),
        )
    else:
        identity = existing_identity

    create_profile(
        db,
        JobProfileCreateRequest(
            identity_id=identity.id,
            bidder_user_ids=[bidder.id],
            roles="Software Engineer",
            email=TEST_PROFILE_EMAIL,
            email_password="test123",
            phone="555-0100",
            reference_tag="test",
            cover_letter="Test profile for development and QA.",
            is_active=True,
        ),
    )
