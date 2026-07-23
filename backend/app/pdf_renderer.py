from pathlib import Path
from html import escape
import re
import secrets
import string

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models import Profile, ResumeContent

BASE_FONT = "Helvetica"
BOLD_FONT = "Helvetica-Bold"


def _styles() -> dict:
    return {
        "name": ParagraphStyle(
            "Name", fontName=BOLD_FONT, fontSize=20, leading=24,
            alignment=TA_CENTER, spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "Title", fontName=BOLD_FONT, fontSize=11.5, leading=14,
            alignment=TA_CENTER, spaceAfter=6,
        ),
        "contact": ParagraphStyle(
            "Contact", fontName=BASE_FONT, fontSize=9.5, leading=12,
            alignment=TA_CENTER, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2", fontName=BOLD_FONT, fontSize=11.5, leading=14,
            alignment=TA_LEFT, spaceBefore=8, spaceAfter=2,
            textColor=colors.black,
        ),
        "summary": ParagraphStyle(
            "Summary", fontName=BASE_FONT, fontSize=9.8, leading=13.5,
            alignment=TA_JUSTIFY, spaceAfter=4,
        ),
        "role_left": ParagraphStyle(
            "RoleLeft", fontName=BASE_FONT, fontSize=10.2, leading=13,
            alignment=TA_LEFT,
        ),
        "role_left_bold": ParagraphStyle(
            "RoleLeftBold", fontName=BOLD_FONT, fontSize=10.2, leading=13,
            alignment=TA_LEFT,
        ),
        "role_right_bold": ParagraphStyle(
            "RoleRightBold", fontName=BOLD_FONT, fontSize=10,
            leading=13, alignment=TA_RIGHT,
        ),
        "role_right": ParagraphStyle(
            "RoleRight", fontName=BASE_FONT, fontSize=10, leading=13,
            alignment=TA_RIGHT,
        ),
        "bullet": ParagraphStyle(
            "Bullet", fontName=BASE_FONT, fontSize=9.7, leading=12.8,
            alignment=TA_JUSTIFY, leftIndent=12, bulletIndent=2, spaceAfter=1.5,
        ),
        "skill": ParagraphStyle(
            "Skill", fontName=BASE_FONT, fontSize=9.7,
            leading=12.5, alignment=TA_LEFT, spaceAfter=3,
        ),
    }


def _hr():
    return HRFlowable(
        width="100%", thickness=0.6, color=colors.black, spaceBefore=1, spaceAfter=4,
    )


def _two_col(left_para, right_para, col_left=4.6, col_right=2.4, bottom_pad=1):
    return Table(
        [[left_para, right_para]],
        colWidths=[col_left * inch, col_right * inch],
        style=TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), bottom_pad),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]),
    )


def _section_header(text: str, story: list, h2_style):
    story.append(Paragraph(text.upper(), h2_style))
    story.append(_hr())


def _pdf_text(value: object) -> str:
    """Escape stored plain text before adding renderer-owned formatting."""
    return escape(str(value or ""), quote=False)


def _skill_terms(content: ResumeContent) -> list[str]:
    terms: set[str] = set()
    for skill in content.skills:
        for value in str(skill.value or "").split(","):
            term = value.strip()
            if len(term) >= 2:
                terms.add(term)
    return sorted(terms, key=len, reverse=True)


def _emphasize_skill_terms(value: object, terms: list[str]) -> str:
    """Bold skill phrases while keeping the persisted content plain text."""
    text = str(value or "")
    if not text or not terms:
        return _pdf_text(text)

    pattern = re.compile(
        rf"(?<!\w)({'|'.join(re.escape(term) for term in terms)})(?!\w)",
        re.IGNORECASE,
    )
    parts: list[str] = []
    cursor = 0
    for match in pattern.finditer(text):
        parts.append(_pdf_text(text[cursor:match.start()]))
        parts.append(f"<b>{_pdf_text(match.group(0))}</b>")
        cursor = match.end()
    parts.append(_pdf_text(text[cursor:]))
    return "".join(parts)


def render_resume_pdf(
    profile: Profile,
    content: ResumeContent,
    output_path: Path,
) -> Path:
    s = _styles()
    story: list = []
    skill_terms = _skill_terms(content)

    title = _pdf_text(content.title)
    contact_parts = [
        profile.phone,
        profile.email,
        profile.linkedin,
        profile.portfolio,
        profile.location,
    ]
    contact_line = " &nbsp;&nbsp;&middot;&nbsp;&nbsp; ".join(
        _pdf_text(part) for part in contact_parts if part
    )

    story.append(Paragraph(_pdf_text(profile.name), s["name"]))
    story.append(Paragraph(title, s["title"]))
    if contact_line:
        story.append(Paragraph(contact_line, s["contact"]))

    _section_header("Professional Summary", story, s["h2"])
    story.append(
        Paragraph(_emphasize_skill_terms(content.summary, skill_terms), s["summary"])
    )

    _section_header("Skills", story, s["h2"])
    for skill in content.skills:
        label = _pdf_text(skill.label)
        value = _pdf_text(skill.value)
        story.append(Paragraph(f"<b>{label}:</b> {value}", s["skill"]))

    _section_header("Work Experience", story, s["h2"])
    for job in content.experience:
        role_left = Paragraph(_pdf_text(job.role), s["role_left_bold"])
        period_right = Paragraph(_pdf_text(job.period), s["role_right_bold"])
        company_left = Paragraph(_pdf_text(job.company), s["role_left_bold"])
        company_right = Paragraph(
            f"<i>{_pdf_text(job.mode)} | {_pdf_text(job.city)}</i>", s["role_right"],
        )
        story.append(KeepTogether([
            _two_col(role_left, period_right),
            _two_col(company_left, company_right, bottom_pad=2),
        ]))
        for bullet in job.bullets:
            b = _emphasize_skill_terms(bullet, skill_terms)
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{b}", s["bullet"]))
        story.append(Spacer(1, 4))

    _section_header("Education", story, s["h2"])
    story.append(Paragraph(_pdf_text(profile.education.school), s["role_left_bold"]))
    edu_left = Paragraph(f"<i>{_pdf_text(profile.education.degree)}</i>", s["role_left"])
    edu_right = Paragraph(_pdf_text(profile.education.period), s["role_right_bold"])
    story.append(_two_col(edu_left, edu_right))

    if profile.certifications:
        _section_header("Certifications", story, s["h2"])
        for cert in profile.certifications:
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{_pdf_text(cert)}", s["bullet"]))

    if content.projects:
        _section_header("Projects", story, s["h2"])
        for i, project in enumerate(content.projects):
            name = _pdf_text(project.name)
            story.append(Paragraph(name, s["role_left_bold"]))
            for bullet in project.bullets:
                b = _emphasize_skill_terms(bullet, skill_terms)
                story.append(Paragraph(f"&bull;&nbsp;&nbsp;{b}", s["bullet"]))
            if i < len(content.projects) - 1:
                story.append(Spacer(1, 4))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        title=f"{profile.name} Resume",
        author=profile.name,
    )
    doc.build(story)
    return output_path


_RANDOM_CHARS = string.ascii_letters + string.digits


def _sanitize_filename_part(name: str) -> str:
    return re.sub(r"[^\w]+", "_", name.strip()).strip("_")


def _random_suffix(length: int = 4) -> str:
    return "".join(secrets.choice(_RANDOM_CHARS) for _ in range(length))


def build_resume_path(display_name: str, sequence_number: int, output_dir: Path) -> Path:
    """Build `{display_name}_{sequence_number:03d}{4 random alnum}.pdf`.

    ``sequence_number`` is the profile's per-resume sequence (existing resume
    count + 1), zero-padded to 3 digits.
    """
    safe = _sanitize_filename_part(display_name)
    app_part = f"{sequence_number:03d}"
    while True:
        filename = f"{safe}_{app_part}{_random_suffix()}.pdf"
        path = output_dir / filename
        if not path.exists():
            return path
