import re
from pathlib import Path

from app.config import INSTRUCTION_DIR
from app.models import Profile, ProfileEducation, ProfileJob


def _value_after(lines: list[str], i: int) -> str:
    if i + 1 < len(lines):
        return lines[i + 1].strip()
    return ""


def parse_profile_markdown(text: str) -> Profile:
    lines = [ln.rstrip() for ln in text.strip().splitlines()]
    data: dict[str, str | list] = {
        "experience": [],
        "certifications": [],
        "projects": [],
    }
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        key = line.lstrip("- ").strip().lower()

        if key == "name":
            data["name"] = _value_after(lines, i)
            i += 2
            continue
        if key == "title":
            data["title"] = _value_after(lines, i)
            i += 2
            continue
        if key == "email":
            data["email"] = _value_after(lines, i)
            i += 2
            continue
        if key == "phone":
            data["phone"] = _value_after(lines, i)
            i += 2
            continue
        if key == "location":
            data["location"] = _value_after(lines, i)
            i += 2
            continue
        if key == "linkedin":
            data["linkedin"] = _value_after(lines, i)
            i += 2
            continue
        if key == "portfolio":
            data["portfolio"] = _value_after(lines, i)
            i += 2
            continue
        if key == "work experience":
            i += 1
            jobs, i = _parse_experience_block(lines, i)
            data["experience"] = jobs
            continue
        if key == "education":
            school = _value_after(lines, i)
            degree_line = lines[i + 2].strip() if i + 2 < len(lines) else ""
            degree, period = _split_degree_period(degree_line)
            data["education"] = ProfileEducation(
                school=school, degree=degree, period=period
            )
            i += 3
            continue
        if key in ("certification", "certifications"):
            i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].startswith("- "):
                data["certifications"].append(lines[i].strip())
                i += 1
            continue
        if key == "projects":
            i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].startswith("- "):
                data["projects"].append(lines[i].strip())
                i += 1
            continue
        i += 1

    return Profile(
        name=data["name"],
        title=data["title"],
        email=data["email"],
        phone=data["phone"],
        location=data["location"],
        linkedin=data["linkedin"],
        portfolio=data.get("portfolio", ""),
        experience=data["experience"],
        education=data["education"],
        certifications=data.get("certifications", []),
        projects=data.get("projects", []),
    )


def _split_degree_period(line: str) -> tuple[str, str]:
    match = re.search(r"(.+?)\s*\(?left-aligned\)?\s*(.+?)\s*\(?right-align\)?", line, re.I)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    parts = re.split(r"\s{2,}|\t", line)
    if len(parts) >= 2:
        return parts[0].strip(), parts[-1].strip()
    return line, ""


def _parse_experience_block(lines: list[str], start: int) -> tuple[list[ProfileJob], int]:
    jobs: list[ProfileJob] = []
    i = start
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("- "):
            break
        if line.endswith(":"):
            company = line.rstrip(":")
            city = lines[i + 1].strip() if i + 1 < len(lines) else ""
            role_line = lines[i + 2].strip() if i + 2 < len(lines) else ""
            job = _parse_role_line(company, city, role_line)
            jobs.append(job)
            i += 3
            continue
        # Company without colon (e.g. "Golden Technology")
        company = line
        city = lines[i + 1].strip() if i + 1 < len(lines) else ""
        role_line = lines[i + 2].strip() if i + 2 < len(lines) else ""
        jobs.append(_parse_role_line(company, city, role_line))
        i += 3
    return jobs, i


def _parse_role_line(company: str, city: str, role_line: str) -> ProfileJob:
    mode = "Remote"
    if "onsite" in role_line.lower():
        mode = "Onsite"
    elif "hybrid" in role_line.lower():
        mode = "Hybrid"

    period_match = re.search(
        r"((?:\w{3},?\s*)?\d{1,2}/\d{4}\s*[-–]\s*(?:\w{3},?\s*)?\d{1,2}/\d{4}|"
        r"(?:\w{3},?\s*)?\d{4}\s*[-–]\s*(?:\w{3},?\s*)?\d{4})",
        role_line,
        re.I,
    )
    period = period_match.group(1) if period_match else ""
    period = re.sub(r"\s+", " ", period.replace(",", " ")).strip()
    period = re.sub(
        r"(\b\w{3})\s+(\d{4})",
        lambda m: f"{m.group(1)}/{m.group(2)}",
        period,
    )
    period = re.sub(
        r"(\d{1,2})/(\d{4})",
        lambda m: f"{int(m.group(1)):02d}/{m.group(2)}",
        period,
    )

    role = role_line.split("|")[0].strip()
    role = re.sub(r"\(.*?\)", "", role).strip()
    role = re.sub(r"\b(Remote|Onsite|Hybrid)\b", "", role, flags=re.I).strip(" |")

    return ProfileJob(
        company=company,
        city=city,
        role=role,
        mode=mode,
        period=period,
    )


def load_default_profile() -> Profile:
    path = INSTRUCTION_DIR / "profiles.md"
    return parse_profile_markdown(path.read_text(encoding="utf-8"))
