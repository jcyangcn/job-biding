import json
import logging
import re
import time

import httpx
from pydantic import ValidationError

from app.config import settings
from app.models import Profile, ResumeContent
from app.prompts import build_generation_prompt

logger = logging.getLogger(__name__)
_RETRYABLE_CURSOR_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}


class CursorAPIError(RuntimeError):
    def __init__(self, message: str, *, retryable: bool = True) -> None:
        super().__init__(message)
        self.retryable = retryable


def generate_resume_content(
    profile: Profile,
    job_description: str,
    provider: str | None = None,
) -> ResumeContent:
    resolved = provider or settings.resolved_provider()
    prompt = build_generation_prompt(profile, job_description)

    if resolved == "cursor":
        attempts = max(1, settings.cursor_generation_attempts)
        for attempt in range(1, attempts + 1):
            try:
                raw = _generate_with_cursor(prompt)
                data = _extract_json(raw)
                return ResumeContent.model_validate(data)
            except CursorAPIError as exc:
                if not exc.retryable or attempt == attempts:
                    raise
                _log_generation_retry(attempt, attempts, exc)
            except (ValueError, ValidationError) as exc:
                # A finished agent can occasionally return truncated JSON or
                # content that misses the strict ResumeContent schema.
                if attempt == attempts:
                    raise
                _log_generation_retry(attempt, attempts, exc)
    elif resolved == "openai":
        raw = _generate_with_openai(prompt)
    else:
        raise ValueError(f"Unknown AI provider: {resolved}")

    data = _extract_json(raw)
    return ResumeContent.model_validate(data)


def _generate_with_cursor(prompt: str) -> str:
    """Use Cursor Cloud Agents REST API (works on Windows; local SDK bridge does not)."""
    api_key = settings.cursor_api_key
    base = "https://api.cursor.com/v1"
    payload: dict = {"prompt": {"text": prompt}}
    if settings.cursor_model:
        payload["model"] = {"id": settings.cursor_model}

    timeout = httpx.Timeout(settings.cursor_request_timeout, connect=20.0)

    with httpx.Client(timeout=timeout) as client:
        create = _cursor_request(
            client,
            "POST",
            f"{base}/agents",
            operation="creating agent",
            json=payload,
            auth=(api_key, ""),
        )
        if create.status_code >= 400:
            detail = create.text
            if "storage" in detail.lower() and "disabled" in detail.lower():
                raise CursorAPIError(
                    "Cursor API requires storage mode. Enable it in Cursor "
                    "Settings → General → Storage, then retry.",
                    retryable=False,
                )
            raise CursorAPIError(
                f"Cursor API error {create.status_code}: {detail}",
                retryable=create.status_code in _RETRYABLE_CURSOR_STATUS_CODES,
            )
        try:
            data = create.json()
            agent_id = data["agent"]["id"]
            run_id = data["run"]["id"]
        except (ValueError, KeyError, TypeError) as exc:
            raise CursorAPIError(
                "Cursor create-agent response did not contain agent and run IDs"
            ) from exc

        deadline = time.monotonic() + max(1.0, settings.cursor_run_timeout)
        poll_url = f"{base}/agents/{agent_id}/runs/{run_id}"
        while time.monotonic() < deadline:
            time.sleep(max(0.5, settings.cursor_poll_interval))
            try:
                run_resp = _cursor_request(
                    client,
                    "GET",
                    poll_url,
                    operation="polling agent run",
                    auth=(api_key, ""),
                )
            except CursorAPIError as exc:
                # The agent is still running remotely. Keep its ID and poll it
                # again instead of abandoning it and creating a duplicate.
                if exc.retryable:
                    logger.warning("Temporary Cursor poll failure: %s", exc)
                    continue
                raise
            if run_resp.status_code >= 400:
                retryable = run_resp.status_code in _RETRYABLE_CURSOR_STATUS_CODES
                if retryable:
                    logger.warning(
                        "Temporary Cursor poll response %s: %s",
                        run_resp.status_code,
                        run_resp.text,
                    )
                    continue
                raise CursorAPIError(
                    f"Cursor run poll error {run_resp.status_code}: "
                    f"{run_resp.text}",
                    retryable=False,
                )
            try:
                run = run_resp.json()
            except ValueError:
                logger.warning("Cursor poll returned invalid JSON; retrying")
                continue
            status = run.get("status", "")
            if status in ("FINISHED", "ERROR", "CANCELLED", "EXPIRED"):
                if status != "FINISHED":
                    raise CursorAPIError(
                        f"Cursor run ended with status {status}"
                    )
                result = run.get("result") or ""
                if not result.strip():
                    raise CursorAPIError(
                        "Cursor run finished with empty result"
                    )
                return result

    raise CursorAPIError(
        "Cursor run timed out after "
        f"{settings.cursor_run_timeout / 60:.0f} minutes"
    )


def _cursor_request(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    operation: str,
    **kwargs,
) -> httpx.Response:
    attempts = max(1, settings.cursor_request_attempts)
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            response = client.request(method, url, **kwargs)
            if (
                response.status_code not in _RETRYABLE_CURSOR_STATUS_CODES
                or attempt == attempts
            ):
                return response
            delay = _cursor_retry_delay(response, attempt)
            logger.warning(
                "Cursor returned HTTP %s while %s; retrying in %.1fs "
                "(attempt %s/%s)",
                response.status_code,
                operation,
                delay,
                attempt,
                attempts,
            )
        except httpx.TransportError as exc:
            last_error = exc
            if attempt == attempts:
                break
            delay = min(2 ** attempt, 30)
            logger.warning(
                "Cursor transport error while %s; retrying in %.1fs "
                "(attempt %s/%s): %s",
                operation,
                delay,
                attempt,
                attempts,
                exc,
            )
        time.sleep(delay)

    raise CursorAPIError(
        f"Cursor API failed while {operation} after {attempts} attempts: "
        f"{last_error}"
    ) from last_error


def _cursor_retry_delay(response: httpx.Response, attempt: int) -> float:
    retry_after = response.headers.get("Retry-After", "").strip()
    try:
        return min(max(float(retry_after), 1.0), 60.0)
    except ValueError:
        return float(min(2 ** attempt, 30))


def _log_generation_retry(attempt: int, attempts: int, exc: Exception) -> None:
    delay = float(min(5 * (2 ** (attempt - 1)), 30))
    logger.warning(
        "Cursor resume generation failed; retrying in %.1fs "
        "(attempt %s/%s): %s",
        delay,
        attempt,
        attempts,
        exc,
    )
    time.sleep(delay)


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
