from pathlib import Path
import re

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
            "Title", fontName=BASE_FONT, fontSize=11.5, leading=14,
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


def render_resume_pdf(
    profile: Profile,
    content: ResumeContent,
    output_path: Path,
) -> Path:
    s = _styles()
    story: list = []

    title = content.title.replace("&", "&amp;")
    contact_parts = [
        profile.phone,
        profile.email,
        profile.linkedin,
    ]
    if profile.portfolio:
        contact_parts.append(profile.portfolio)
    contact_parts.append(profile.location)
    contact_line = " &nbsp;&nbsp;&middot;&nbsp;&nbsp; ".join(contact_parts)

    story.append(Paragraph(profile.name, s["name"]))
    story.append(Paragraph(title, s["title"]))
    story.append(Paragraph(contact_line, s["contact"]))

    _section_header("Professional Summary", story, s["h2"])
    story.append(Paragraph(content.summary, s["summary"]))

    _section_header("Work Experience", story, s["h2"])
    for job in content.experience:
        role_left = Paragraph(f"<b>{job.role}</b>", s["role_left"])
        period_right = Paragraph(f"<b>{job.period}</b>", s["role_right_bold"])
        company_left = Paragraph(f"<b>{job.company}</b>", s["role_left"])
        company_right = Paragraph(
            f"<i>{job.mode} | {job.city}</i>", s["role_right"],
        )
        story.append(KeepTogether([
            _two_col(role_left, period_right),
            _two_col(company_left, company_right, bottom_pad=2),
        ]))
        for bullet in job.bullets:
            b = bullet.replace("&", "&amp;")
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{b}", s["bullet"]))
        story.append(Spacer(1, 4))

    _section_header("Education", story, s["h2"])
    story.append(Paragraph(f"<b>{profile.education.school}</b>", s["role_left"]))
    edu_left = Paragraph(f"<i>{profile.education.degree}</i>", s["role_left"])
    edu_right = Paragraph(f"<b>{profile.education.period}</b>", s["role_right_bold"])
    story.append(_two_col(edu_left, edu_right))

    _section_header("Skills", story, s["h2"])
    for skill in content.skills:
        label = skill.label.replace("&", "&amp;")
        value = skill.value.replace("&", "&amp;")
        story.append(Paragraph(f"<b>{label}:</b> {value}", s["skill"]))

    if profile.certifications:
        _section_header("Certifications", story, s["h2"])
        for cert in profile.certifications:
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{cert}", s["bullet"]))

    if content.projects:
        _section_header("Projects", story, s["h2"])
        for i, project in enumerate(content.projects):
            name = project.name.replace("&", "&amp;")
            story.append(Paragraph(f"<b>{name}</b>", s["role_left"]))
            for bullet in project.bullets:
                b = bullet.replace("&", "&amp;")
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


def next_resume_path(name: str, output_dir: Path) -> Path:
    safe = re.sub(r"[^\w]+", "_", name.strip()).strip("_")
    existing = list(output_dir.glob(f"{safe}_*.pdf"))
    nums = []
    for path in existing:
        suffix = path.stem.rsplit("_", 1)[-1]
        if suffix.isdigit():
            nums.append(int(suffix))
    n = max(nums, default=0) + 1
    return output_dir / f"{safe}_{n}.pdf"
