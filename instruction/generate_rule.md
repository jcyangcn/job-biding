## Goal
To generate best & strong resume - more impressive and high scored for the ATS.

## Job description
See /JD.md file.

Upon receiving the JD, create a PDF format resume, a complete, fully tailored resume informed by the JD but written as a career-consistent, reusable professional document.


## For the content style, follow sample_resume.pdf file.
Do not use borders, tables, separators, or horizontal rules.

---

## Use profile information profiles.md file.

### Mandatory Resume Structure (Must Match Exactly)

Name (H1)

Title (H4)

Phone · Email · Linkedin · Address(H4)

Professional Summary (H2)
put <hr/>

Work Experience (H2) (this should be latest first to old ones)
put <hr/>

Role(left-align)  + Employment Period (Strong, align-right for period)
Company Name (H3)(left-align)  + location (Remote|Onsite|Hybrid) (right-align)
(for example,  
Senior Software Engineer                                    08/2022 – 03/2026
TechCrunch                                          Remote | San Francisco, CA
)

Bullet points

Education (H2)
put <hr/>
- University (Strong)
    Degree (major : align-left) and period(align-right)
    

Skills (H2)
put <hr/>
- Frontend:
- Backend:
- Databases:
- Cloud & DevOps:
- Monitoring & Tools:
- Workflow & PM:

Certifications (H2)
put <hr/>
Projects
put <hr/>
---

### Non-Negotiable Rules (Highest Priority)

- Keep 4–7 bullets for junior roles and 7–10 bullets for senior or staff-level roles, and do not exceed or fall below the applicable range.
- Follow heading hierarchy and section order precisely.
- Do not ask clarifying questions unless information is missing.
- The Professional Summary must be fewer than 520 characters (including spaces) and must be internally length-checked before output.
- Every bullet can contain at least one purposeful bolded phrase. Bolded text may include impactful actions, outcomes, architectural ownership, scale, core technologies, systems, or critical skills, and must always convey substantive signal rather than decorative emphasis.
- Bold text must never introduce artificial metrics or JD-specific phrasing.

---

### Content Quality & Impact Guidelines

- Write ownership-driven, outcome-focused bullets, not task descriptions.
- Use varied, strong action verbs; avoid buzzwords.
- 50–60% of bullets should include quantified or scoped impact.
- Default to two-line bullets; three lines only for complex initiatives.
- Naturally align to JD keywords for ATS compatibility (no mirroring or stuffing).
- Emphasize:
    - Technical leadership and mentorship
    - Cross-team architectural influence
    - Stakeholder and executive collaboration
    - AI-enabled full stack experience
    - SaaS and platform-scale systems

---

### Anti-Overfitting & Naturalness Constraints

- Do not mirror JD language, phrasing, or structure.
- Use industry-standard terminology, not JD-specific wording.
- Each bullet must represent a career-invariant accomplishment reusable across similar roles.
- If a JD requirement is weakly supported, reflect it indirectly or adjacently.
- The resume should be reusable for multiple similar roles with minimal edits.

---

### Execution Requirement

Generate resumes as PDF files in `storage/downloads/generated_resumes/`.

Filename format: `{resume_profile_display_name}_{application_id_3_digits}{4_random_alphanumeric}.pdf`

Example: `Thomas_Raville_007aB3x9.pdf` — name shown on the resume PDF, zero-padded application sequence (001, 002, …), plus 4 random letters/numbers.


