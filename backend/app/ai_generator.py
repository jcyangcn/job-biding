import json
import re

from app.config import settings
from app.models import Profile, ResumeContent
from app.prompts import build_generation_prompt


def generate_resume_content(
    profile: Profile,
    job_description: str,
    provider: str | None = None,
) -> ResumeContent:
    resolved = provider or settings.resolved_provider()
    prompt = build_generation_prompt(profile, job_description)

    if resolved == "cursor":
        raw = _generate_with_cursor(prompt)
    elif resolved == "openai":
        raw = _generate_with_openai(prompt)
    else:
        raise ValueError(f"Unknown AI provider: {resolved}")

    data = _extract_json(raw)
    return ResumeContent.model_validate(data)


def _generate_with_cursor(prompt: str) -> str:
    """Use Cursor Cloud Agents REST API (works on Windows; local SDK bridge does not)."""
    import time

    import httpx

    api_key = settings.cursor_api_key
    base = "https://api.cursor.com/v1"
    payload: dict = {"prompt": {"text": prompt}}
    if settings.cursor_model:
        payload["model"] = {"id": settings.cursor_model}

    # Creating a Cursor Cloud Agent regularly takes ~60s to return, so use a
    # generous read timeout (configurable) and retry once on a network timeout.
    timeout = httpx.Timeout(settings.cursor_request_timeout, connect=20.0)

    with httpx.Client(timeout=timeout) as client:
        create = None
        last_timeout_error: httpx.TimeoutException | None = None
        for attempt in range(2):
            try:
                create = client.post(
                    f"{base}/agents", json=payload, auth=(api_key, "")
                )
                break
            except httpx.TimeoutException as exc:
                last_timeout_error = exc
        if create is None:
            raise RuntimeError(
                "Cursor API timed out while creating the agent after "
                f"{settings.cursor_request_timeout:.0f}s. Try again, or raise "
                "CURSOR_REQUEST_TIMEOUT in the backend .env."
            ) from last_timeout_error
        if create.status_code >= 400:
            detail = create.text
            if "storage" in detail.lower() and "disabled" in detail.lower():
                raise RuntimeError(
                    "Cursor API requires storage mode. Enable it in "
                    "Cursor Settings → General → Storage, then retry."
                )
            raise RuntimeError(
                f"Cursor API error {create.status_code}: {detail}"
            )
        data = create.json()
        agent_id = data["agent"]["id"]
        run_id = data["run"]["id"]

        for _ in range(120):
            time.sleep(5)
            run_resp = client.get(
                f"{base}/agents/{agent_id}/runs/{run_id}",
                auth=(api_key, ""),
            )
            if run_resp.status_code >= 400:
                raise RuntimeError(
                    f"Cursor run poll error {run_resp.status_code}: {run_resp.text}"
                )
            run = run_resp.json()
            status = run.get("status", "")
            if status in ("FINISHED", "ERROR", "CANCELLED", "EXPIRED"):
                if status != "FINISHED":
                    raise RuntimeError(
                        f"Cursor run ended with status {status}"
                    )
                result = run.get("result") or ""
                if not result.strip():
                    raise RuntimeError("Cursor run finished with empty result")
                return result

    raise RuntimeError("Cursor run timed out after 10 minutes")


def _generate_with_openai(prompt: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": "You output only valid JSON. No markdown fences.",
            },
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content or ""


def _extract_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("AI response did not contain JSON object")
    return json.loads(text[start : end + 1])
