import re
from html.parser import HTMLParser
from typing import Any

from app.models import ResumeContent

_BLOCK_TAGS = {
    "address",
    "article",
    "aside",
    "blockquote",
    "div",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "tr",
    "ul",
}
_SUPPRESSED_TAGS = {"script", "style"}


class _PlainTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.suppressed_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        if tag in _SUPPRESSED_TAGS:
            self.suppressed_depth += 1
            return
        if self.suppressed_depth:
            return
        if tag == "br" or tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_startendtag(self, tag: str, attrs) -> None:
        if not self.suppressed_depth and tag.lower() == "br":
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in _SUPPRESSED_TAGS:
            self.suppressed_depth = max(0, self.suppressed_depth - 1)
            return
        if not self.suppressed_depth and tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.suppressed_depth:
            self.parts.append(data)


def strip_html_tags(value: str | None) -> str:
    """Convert HTML to readable plain text while preserving paragraph breaks."""
    if value is None:
        return ""
    text = str(value)
    if "<" not in text and "&" not in text:
        return text.strip()

    parser = _PlainTextParser()
    parser.feed(text)
    parser.close()
    plain = "".join(parser.parts).replace("\xa0", " ")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in plain.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def sanitize_nested_text(value: Any) -> Any:
    """Recursively remove HTML from every string in a JSON-compatible value."""
    if isinstance(value, str):
        return strip_html_tags(value)
    if isinstance(value, dict):
        return {key: sanitize_nested_text(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize_nested_text(item) for item in value]
    if isinstance(value, tuple):
        return tuple(sanitize_nested_text(item) for item in value)
    return value


def sanitize_resume_content(content: ResumeContent) -> ResumeContent:
    clean = sanitize_nested_text(content.model_dump(mode="json"))
    return ResumeContent.model_validate(clean)
