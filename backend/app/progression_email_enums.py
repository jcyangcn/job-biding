import enum


class ProgressionEmailType(str, enum.Enum):
    human_interview = "human_interview"
    technical_assignment = "technical_assignment"
    test_task = "test_task"
    submit_availability = "submit_availability"
    other = "other"


class ProgressionEmailStatus(str, enum.Enum):
    received = "received"
    assigned = "assigned"
    done = "done"
    waiting_reply = "waiting_reply"
    rejected = "rejected"
    decided_not_to_process = "decided_not_to_process"


PROGRESSION_EMAIL_TYPE_VALUES = tuple(item.value for item in ProgressionEmailType)
PROGRESSION_EMAIL_STATUS_VALUES = tuple(item.value for item in ProgressionEmailStatus)
