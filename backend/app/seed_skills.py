"""Default skill keywords grouped by field (category)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import JobSkill

# field -> keywords
SKILL_CATALOG: dict[str, list[str]] = {
    "Languages & Core Technologies": [
        "JavaScript",
        "TypeScript",
        "Python",
        "Java",
        "C#",
        "Ruby",
        "PHP",
        "Go",
        "SQL",
        "HTML5",
        "CSS3",
        "ES6+",
        "React",
        "Angular",
        "Vue.js",
        "Node.js",
        "Express.js",
        "Django",
        "Flask",
        "Spring Boot",
        "ASP.NET",
        ".NET",
        "Ruby on Rails",
        "Next.js",
        "REST APIs",
        "jQuery",
        "Redux",
    ],
    "Databases": [
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Redis",
        "SQL",
        "Database Design",
        "Query Optimization",
        "Database Management",
        "NoSQL",
        "DynamoDB",
        "Elasticsearch",
        "Cassandra",
    ],
    "Cloud & DevOps": [
        "AWS",
        "Azure",
        "GCP",
        "Docker",
        "Kubernetes",
        "CI/CD",
        "GitHub Actions",
        "Jenkins",
        "Linux",
        "Nginx",
        "Terraform",
        "Cloud Deployment",
        "Serverless",
        "Containerization",
        "Microservices",
        "Infrastructure as Code",
        "Cloud Services",
        "DevOps",
    ],
    "Tools & Version Control": [
        "Git",
        "GitHub",
        "GitLab",
        "npm",
        "yarn",
        "Webpack",
        "Vite",
        "Postman",
        "VS Code",
    ],
    "Testing & Quality": [
        "Jest",
        "Cypress",
        "PyTest",
        "JUnit",
        "Unit Testing",
        "Integration Testing",
        "E2E Testing",
        "TDD",
        "Test-Driven Development (TDD)",
        "Code Coverage",
        "Automated Testing",
    ],
    "Architecture & System Design": [
        "System Design",
        "Scalable Architecture",
        "Scalability",
        "Microservices",
        "REST APIs",
        "GraphQL",
        "API Design",
        "API Integration",
        "Webhooks",
        "Caching",
        "Load Balancing",
        "Event-Driven Architecture",
        "Message Queues",
        "Distributed Systems",
        "WebSockets",
        "Performance Optimization",
    ],
    "Security & Authentication": [
        "Authentication",
        "Authorization",
        "OAuth",
        "JWT",
        "Web Security",
        "HTTPS",
        "CORS",
        "Security Best Practices",
    ],
    "Methodologies & Practices": [
        "Agile",
        "Scrum",
        "Code Review",
        "Pair Programming",
        "Technical Documentation",
        "Project Planning",
        "Project Management",
        "Stakeholder Communication",
        "Cross-functional Collaboration",
        "Mentoring",
        "Technical Leadership",
        "Problem Solving",
        "Communication",
        "Debugging",
        "Critical Thinking",
        "End-to-End Development",
    ],
    "Tech Stacks & Concepts": [
        "MERN Stack",
        "MEAN Stack",
        "LAMP Stack",
        "JAMstack",
        "Full Stack",
    ],
}


def seed_skills(db: Session, *, role: str = "Full stack engineer") -> int:
    """Insert missing skill keywords. Returns number of rows inserted."""
    existing = {
        (
            (row.role or "").strip().lower(),
            (row.field or "").strip().lower(),
            (row.keyword or "").strip().lower(),
        )
        for row in db.scalars(select(JobSkill)).all()
    }

    inserted = 0
    role_name = role.strip()
    for field, keywords in SKILL_CATALOG.items():
        field_name = field.strip()
        seen_in_field: set[str] = set()
        for keyword in keywords:
            keyword_name = keyword.strip()
            if not keyword_name:
                continue
            lowered = keyword_name.lower()
            if lowered in seen_in_field:
                continue
            seen_in_field.add(lowered)
            key = (role_name.lower(), field_name.lower(), lowered)
            if key in existing:
                continue
            db.add(
                JobSkill(
                    role=role_name,
                    field=field_name,
                    keyword=keyword_name,
                    weight=1.0,
                )
            )
            existing.add(key)
            inserted += 1

    if inserted:
        db.commit()
    return inserted
