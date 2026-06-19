import json

from app.config import INSTRUCTION_DIR
from app.models import Profile


def build_generation_prompt(profile: Profile, job_description: str) -> str:
    rules_path = INSTRUCTION_DIR / "generate_rule.md"
    rules = rules_path.read_text(encoding="utf-8")

    profile_facts = {
        "name": profile.name,
        "base_title": profile.title,
        "experience": [j.model_dump() for j in reversed(profile.experience)],
        "education": profile.education.model_dump(),
        "certifications": profile.certifications,
        "project_names": profile.projects,
    }

    return f"""You are an expert resume writer. Generate tailored resume CONTENT as JSON only.

## Rules
{rules}

## Immutable profile facts (do NOT change company names, roles, dates, locations, or modes)
{json.dumps(profile_facts, indent=2)}

## Job description
{job_description}

## Output instructions
Return ONLY valid JSON (no markdown fences, no commentary) matching this schema:
{{
  "title": "tailored professional title string",
  "summary": "professional summary under 520 characters",
  "experience": [
    {{
      "company": "exact from profile",
      "city": "exact from profile",
      "role": "exact from profile",
      "mode": "exact from profile",
      "period": "exact from profile",
      "bullets": ["bullet with <b>bold phrases</b>", "..."]
    }}
  ],
  "skills": [
    {{"label": "Frontend", "value": "comma-separated skills"}},
    {{"label": "Backend", "value": "..."}},
    {{"label": "Databases", "value": "..."}},
    {{"label": "Cloud & DevOps", "value": "..."}},
    {{"label": "Monitoring & Tools", "value": "..."}},
    {{"label": "Workflow & PM", "value": "..."}}
  ],
  "projects": [
    {{"name": "exact project name from profile", "bullets": ["...", "..."]}}
  ]
}}

Bullet count rules:
- Junior roles (Frontend Developer, Fullstack Developer): 4-7 bullets
- Senior roles: 7-10 bullets
Experience order: latest job first (same as profile order if already latest-first).

Use <b>...</b> HTML tags for bold emphasis in bullets. Summary must be plain text without HTML."""
