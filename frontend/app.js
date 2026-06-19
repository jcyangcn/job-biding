const $ = (id) => document.getElementById(id);

let profileMode = "markdown";

function setStatus(message, type = "") {
  const el = $("status");
  el.textContent = message;
  el.className = `status ${type}`.trim();
}

function setMode(mode) {
  profileMode = mode;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });
  $("panel-markdown").classList.toggle("hidden", mode !== "markdown");
  $("panel-json").classList.toggle("hidden", mode !== "json");
}

function filenameFromDisposition(header) {
  if (!header) return "resume.pdf";
  const match = /filename="?([^";\n]+)"?/.exec(header);
  return match ? match[1] : "resume.pdf";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

async function loadDefaultProfileMarkdown() {
  try {
    $("profile-md").value = await fetchText("/api/profile/default/markdown");
  } catch {
    /* leave empty if unavailable */
  }
}

function buildRequestBody() {
  const job_description = $("jd").value.trim();
  if (job_description.length < 50) {
    throw new Error("Job description must be at least 50 characters.");
  }

  const body = { job_description };

  if (profileMode === "markdown") {
    const md = $("profile-md").value.trim();
    if (!md) throw new Error("Enter profile markdown.");
    body.profile_markdown = md;
  } else if (profileMode === "json") {
    const raw = $("profile-json").value.trim();
    if (!raw) throw new Error("Enter profile JSON.");
    try {
      body.profile = JSON.parse(raw);
    } catch {
      throw new Error("Profile JSON is invalid.");
    }
  }

  return body;
}

async function generateResume() {
  const btn = $("generate");
  btn.disabled = true;
  setStatus("Generating resume… this usually takes 1–3 minutes.", "loading");

  try {
    const body = buildRequestBody();
    const res = await fetch("/api/resumes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let detail = `Request failed (${res.status})`;
      try {
        const err = await res.json();
        if (err.detail) detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }

    const blob = await res.blob();
    const filename = filenameFromDisposition(res.headers.get("Content-Disposition"));
    downloadBlob(blob, filename);
    setStatus(`Done — downloaded ${filename}`, "success");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", "error");
  } finally {
    btn.disabled = false;
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

$("generate").addEventListener("click", generateResume);

$("load-jd").addEventListener("click", async () => {
  try {
    $("jd").value = await fetchText("/api/jd/default");
    setStatus("Loaded JD.md", "success");
  } catch (err) {
    setStatus(err.message, "error");
  }
});

$("load-profile-md").addEventListener("click", async () => {
  try {
    $("profile-md").value = await fetchText("/api/profile/default/markdown");
    setMode("markdown");
    setStatus("Loaded default profile markdown", "success");
  } catch (err) {
    setStatus(err.message, "error");
  }
});

$("load-profile-json").addEventListener("click", async () => {
  try {
    const profile = await fetchJson("/api/profile/default");
    $("profile-json").value = JSON.stringify(profile, null, 2);
    setMode("json");
    setStatus("Loaded default profile as JSON", "success");
  } catch (err) {
    setStatus(err.message, "error");
  }
});

loadDefaultProfileMarkdown();
