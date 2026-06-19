"""Build Thomas Raville resume PDF tailored to the Lavendo SA JD."""
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, KeepTogether, Table, TableStyle,
    HRFlowable,
)
from reportlab.lib import colors
from pathlib import Path

OUT = Path(__file__).parent / "Thomas_Raville_7.pdf"

BASE_FONT = "Helvetica"
BOLD_FONT = "Helvetica-Bold"

name_style = ParagraphStyle("Name", fontName=BOLD_FONT, fontSize=20, leading=24,
                            alignment=TA_CENTER, spaceAfter=2)
title_style = ParagraphStyle("Title", fontName=BASE_FONT, fontSize=11.5, leading=14,
                             alignment=TA_CENTER, spaceAfter=6)
contact2_style = ParagraphStyle("Contact2", fontName=BASE_FONT, fontSize=9.5, leading=12,
                                alignment=TA_CENTER, spaceAfter=8)
h2_style = ParagraphStyle("H2", fontName=BOLD_FONT, fontSize=11.5, leading=14,
                          alignment=TA_LEFT, spaceBefore=8, spaceAfter=2,
                          textColor=colors.black)
profile_style = ParagraphStyle("Profile", fontName=BASE_FONT, fontSize=9.8, leading=13.5,
                               alignment=TA_JUSTIFY, spaceAfter=4)
role_left_style = ParagraphStyle("RoleLeft", fontName=BASE_FONT, fontSize=10.2, leading=13,
                                 alignment=TA_LEFT)
role_right_bold_style = ParagraphStyle("RoleRightBold", fontName=BOLD_FONT, fontSize=10,
                                       leading=13, alignment=TA_RIGHT)
role_right_style = ParagraphStyle("RoleRight", fontName=BASE_FONT, fontSize=10, leading=13,
                                  alignment=TA_RIGHT)
bullet_style = ParagraphStyle("Bullet", fontName=BASE_FONT, fontSize=9.7, leading=12.8,
                              alignment=TA_JUSTIFY, leftIndent=12, bulletIndent=2,
                              spaceAfter=1.5)
skill_value_style = ParagraphStyle("SkillValue", fontName=BASE_FONT, fontSize=9.7,
                                   leading=12.5, alignment=TA_LEFT, spaceAfter=3)

def hr():
    return HRFlowable(width="100%", thickness=0.6, color=colors.black,
                      spaceBefore=1, spaceAfter=4)

def section_header(text, story):
    story.append(Paragraph(text.upper(), h2_style))
    story.append(hr())

def two_col(left_para, right_para, col_left=4.6, col_right=2.4, bottom_pad=1):
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

NAME = "Thomas Raville"
TITLE = "Senior Software Engineer | Solutions &amp; AI"
EMAIL = "tomasraville.dev@gmail.com"
PHONE = "(720) 797-9459"
LOCATION = "Arvada, CO"
LINKEDIN = "linkedin.com/in/thomas-raville-0601b61a2"
PORTFOLIO = "thomas-raville-portfolio.vercel.app"

SUMMARY = (
    "Senior Software Engineer with 12 years building API-driven platforms, "
    "technical client engagements, and AI-enabled integrations across "
    "TypeScript, Python, and Node.js. Proven end-to-end ownership from "
    "discovery and proof-of-concept through production rollout, stakeholder "
    "training, and translating complex requirements into scalable "
    "architectures. Experienced in regulated enterprise environments, "
    "high-growth remote teams, and shaping product direction through "
    "field insights."
)
assert len(SUMMARY) < 520, f"summary too long: {len(SUMMARY)}"

EXPERIENCE = [
    {
        "company": "TechCrunch",
        "city": "San Francisco, CA",
        "role": "Senior Software Engineer",
        "mode": "Remote",
        "period": "08/2022 – 03/2026",
        "bullets": [
            "Served as <b>technical point of contact</b> for editorial and partner integrations, leading discovery sessions and scoping <b>API requirements</b> across TypeScript services and third-party platforms.",
            "Built <b>Python and TypeScript proof-of-concept integrations</b> to validate partner workflows before production rollout, shortening evaluation cycles by <b>40%</b>.",
            "Owned the <b>end-to-end API lifecycle</b>—schema design, documentation, pilot testing, rollout, and post-launch troubleshooting—for platform services used by <b>5M+ monthly contributors</b>.",
            "Designed <b>reference architectures</b> standardizing authentication, rate limiting, and observability patterns across internal platform consumers.",
            "Delivered <b>hands-on training and integration guides</b> for engineering and editorial teams adopting new capabilities, reducing adoption friction across <b>12+ internal products</b>.",
            "Actively builds with <b>AI agent workflows</b> (Claude, Cursor, custom automations) to accelerate debugging, documentation, and integration testing in daily engineering work.",
            "Translated <b>cross-functional partner feedback</b> into prioritized product and engineering roadmap items, influencing quarterly planning for platform teams.",
            "Architected <b>Node.js and TypeScript microservices</b> with structured logging and distributed tracing, maintaining <b>sub-200ms p95 latency</b> at production scale.",
            "Mentored <b>6 engineers</b> on API design, client-facing technical communication, and high-quality integration patterns through reviews and pairing.",
        ],
    },
    {
        "company": "Golden Technology",
        "city": "Glendale, OH",
        "role": "Senior Fullstack Engineer",
        "mode": "Remote",
        "period": "10/2020 – 07/2022",
        "bullets": [
            "Led <b>technical implementation</b> for HIPAA-regulated healthcare clients from requirements discovery through <b>API integration</b>, pilot, and production handoff.",
            "Designed <b>REST and WebSocket APIs</b> connecting clinical systems, third-party AI services, and provider dashboards across enterprise deployments.",
            "Built <b>Python and TypeScript prototypes</b> validating clinical workflow integrations before full-stack delivery, de-risking compliance-sensitive rollouts.",
            "Authored <b>integration documentation and reference patterns</b> for partner engineering teams, accelerating onboarding for <b>4 concurrent client implementations</b>.",
            "Served as <b>primary technical advisor</b> to product and compliance stakeholders, translating clinical constraints into actionable architecture decisions.",
            "Integrated <b>third-party AI summarization APIs</b> with guardrails, audit trails, and human-in-the-loop review for regulated documentation workflows.",
            "Hardened <b>OAuth 2.0 and role-based access control</b> across multi-tenant services, meeting enterprise security reviews and audit requirements.",
            "Established <b>Jest and Playwright testing</b> for integration regression coverage, cutting escape rate across the platform by <b>50%</b>.",
            "Partnered with product to feed <b>client implementation learnings</b> back into platform roadmap priorities.",
        ],
    },
    {
        "company": "IgniteTech",
        "city": "Austin, TX",
        "role": "Fullstack Developer",
        "mode": "Remote",
        "period": "06/2018 – 09/2020",
        "bullets": [
            "Modernized a legacy enterprise analytics suite, migrating Java services to <b>TypeScript and Node.js APIs</b> with integration guides for downstream consumers.",
            "Built <b>Python and JavaScript scripts</b> to prototype data pipeline integrations and validate partner API behavior against poorly documented endpoints.",
            "Delivered <b>Vue.js and TypeScript interfaces</b> with reusable component patterns, accelerating delivery across four product lines at a high-growth scale-up.",
            "Designed <b>GitLab CI pipelines</b> automating build, lint, and integration test stages, reducing release cycle time by <b>40%</b>.",
            "Introduced <b>distributed tracing and structured logging</b> across backend services, cutting mean time to resolution by <b>55%</b>.",
            "Collaborated in a <b>fully remote, asynchronous team</b> across time zones, contributing written design docs and client-facing technical reviews.",
        ],
    },
    {
        "company": "Duda",
        "city": "Louisville, CO",
        "role": "Frontend Developer",
        "mode": "Onsite",
        "period": "02/2014 – 05/2018",
        "bullets": [
            "Built core <b>website builder UI features</b> in JavaScript, HTML5, and CSS3 used by agencies to launch thousands of sites each month.",
            "Integrated third-party APIs (<b>Stripe, HubSpot, Salesforce</b>) into the editor UI, mapping partner schemas and troubleshooting onboarding issues with agency clients.",
            "Implemented <b>drag-and-drop editor components</b> with real-time preview and collaborative editing state management.",
            "Optimized client-side rendering and asset delivery through <b>code splitting, lazy loading, and CDN-backed caching</b>, improving site load performance by <b>50%</b>.",
            "Developed a library of <b>reusable UI components and responsive templates</b>, standardizing look-and-feel and accelerating new theme delivery.",
            "Improved <b>cross-browser compatibility and accessibility</b> across the builder surface, reducing support tickets from agency clients.",
        ],
    },
]

EDUCATION = {
    "school": "Georgia Institute of Technology",
    "degree": "Bachelor's degree in Information Technology",
    "period": "2008 – 2013",
}

SKILLS = [
    ("Frontend", "TypeScript, JavaScript, Vue 3, React, HTML5, CSS3, Tailwind CSS"),
    ("Backend", "Python, Node.js, TypeScript, REST, GraphQL, WebSockets, API design, integration patterns, FastAPI, Express"),
    ("Databases", "PostgreSQL, MySQL, MongoDB, Redis, DynamoDB"),
    ("Cloud &amp; DevOps", "AWS, GCP, Docker, Kubernetes, Terraform, GitLab CI, GitHub Actions"),
    ("Monitoring &amp; Tools", "OpenTelemetry, Grafana, Sentry, Postman, Claude, Cursor, AI agent workflows, automated testing"),
    ("Workflow &amp; PM", "client discovery, technical demos, integration documentation, async RFCs, remote-first collaboration, mentorship"),
]

CERTIFICATIONS = ["Google Analytics Individual Qualification"]

PROJECTS = [
    {
        "name": "Healthcare Platform (AI-Driven, HIPAA-Compliant System)",
        "bullets": [
            "Architected a <b>multi-service TypeScript platform</b> for clinical intake, scheduling, and AI-assisted documentation, deployed across regulated environments.",
            "Built a <b>Vue 3 clinician workspace</b> with a shared component library and accessibility baked in, reducing charting time by <b>40%</b>.",
            "Integrated <b>LLM-powered summarization</b> of patient encounters with guardrails, audit trails, and human-in-the-loop review workflows.",
            "Implemented <b>HIPAA-grade authentication, encryption, and audit logging</b> with OAuth 2.0 and field-level access controls.",
        ],
    },
    {
        "name": "Shipment &amp; Logistics Platform (Real-Time Tracking System)",
        "bullets": [
            "Designed an <b>event-driven Node.js backend</b> ingesting GPS telemetry and carrier webhooks, powering real-time shipment visibility for enterprise shippers.",
            "Delivered a <b>Vue-based dispatcher console</b> with live maps, SLA alerts, and role-specific dashboards across shippers, drivers, and operations.",
            "Introduced <b>WebSocket channels and Redis streams</b> to keep tracking state synchronized across thousands of concurrent sessions without broadcast storms.",
            "Shipped <b>observability tooling (OpenTelemetry, Grafana)</b> that cut mean time to detection for routing anomalies by <b>65%</b>.",
        ],
    },
]

story = []

story.append(Paragraph(NAME, name_style))
story.append(Paragraph(TITLE, title_style))
story.append(Paragraph(
    f"{PHONE} &nbsp;&nbsp;&middot;&nbsp;&nbsp; {EMAIL} &nbsp;&nbsp;&middot;&nbsp;&nbsp; {LINKEDIN} &nbsp;&nbsp;&middot;&nbsp;&nbsp; {PORTFOLIO} &nbsp;&nbsp;&middot;&nbsp;&nbsp; {LOCATION}",
    contact2_style,
))

section_header("Professional Summary", story)
story.append(Paragraph(SUMMARY, profile_style))

section_header("Work Experience", story)
for job in EXPERIENCE:
    # Line 1: Role (left, bold) | Period (right, bold)
    role_left = Paragraph(f"<b>{job['role']}</b>", role_left_style)
    period_right = Paragraph(f"<b>{job['period']}</b>", role_right_bold_style)
    # Line 2: Company Name (left, bold) | Mode | City (right)
    company_left = Paragraph(f"<b>{job['company']}</b>", role_left_style)
    right_text = f"<i>{job['mode']} | {job['city']}</i>"
    company_right = Paragraph(right_text, role_right_style)
    story.append(KeepTogether([
        two_col(role_left, period_right),
        two_col(company_left, company_right, bottom_pad=2),
    ]))
    for b in job["bullets"]:
        story.append(Paragraph(f"&bull;&nbsp;&nbsp;{b}", bullet_style))
    story.append(Spacer(1, 4))

section_header("Education", story)
story.append(Paragraph(f"<b>{EDUCATION['school']}</b>", role_left_style))
edu_left = Paragraph(f"<i>{EDUCATION['degree']}</i>", role_left_style)
edu_right = Paragraph(f"<b>{EDUCATION['period']}</b>", role_right_bold_style)
story.append(two_col(edu_left, edu_right))

section_header("Skills", story)
for label, value in SKILLS:
    story.append(Paragraph(f"<b>{label}:</b> {value}", skill_value_style))

section_header("Certifications", story)
for c in CERTIFICATIONS:
    story.append(Paragraph(f"&bull;&nbsp;&nbsp;{c}", bullet_style))

section_header("Projects", story)
for i, p in enumerate(PROJECTS):
    story.append(Paragraph(f"<b>{p['name']}</b>", role_left_style))
    for b in p["bullets"]:
        story.append(Paragraph(f"&bull;&nbsp;&nbsp;{b}", bullet_style))
    if i < len(PROJECTS) - 1:
        story.append(Spacer(1, 4))

doc = SimpleDocTemplate(
    str(OUT), pagesize=LETTER,
    leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    topMargin=0.5 * inch, bottomMargin=0.5 * inch,
    title=f"{NAME} Resume", author=NAME,
)
doc.build(story)
print(f"wrote {OUT}")
print(f"summary chars: {len(SUMMARY)}")
