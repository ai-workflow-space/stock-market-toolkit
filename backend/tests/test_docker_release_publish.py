"""Contract test for the Docker publish workflow's versioned-release behavior.

Regression guard for the bug where the published image's version tag was always
``v0.0.0`` (shallow checkout, no tags, no release trigger). Asserts that
``.github/workflows/docker.yml``:
  - triggers on published releases,
  - publishes images on release events,
  - emits semver (version-numbered) tags via docker/metadata-action,
  - checks out full history/tags (fetch-depth: 0) in the publish job.
"""

from pathlib import Path

import yaml

WORKFLOW = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "docker.yml"
)


def _load():
    data = yaml.safe_load(WORKFLOW.read_text())
    # PyYAML parses the bare key ``on:`` as the boolean True (YAML 1.1), so the
    # trigger block may live under either the string "on" or the boolean True.
    triggers = data.get("on", data.get(True))
    return data, triggers


def _steps_using(data, prefix):
    job = data["jobs"]["build-and-push"]
    return [s for s in job["steps"] if str(s.get("uses", "")).startswith(prefix)]


def test_triggers_on_published_release():
    _, triggers = _load()
    assert "release" in triggers, "docker.yml must trigger on release events"
    assert triggers["release"]["types"] == ["published"]


def test_publish_steps_push_on_release():
    data, _ = _load()
    steps = _steps_using(data, "docker/build-push-action")
    assert len(steps) == 2, "expected backend and frontend build-push steps"
    for step in steps:
        push_expr = str(step["with"]["push"])
        assert "release" in push_expr, f"push must include release events: {push_expr}"


def test_semver_tags_via_metadata_action():
    data, _ = _load()
    meta_steps = _steps_using(data, "docker/metadata-action")
    assert len(meta_steps) == 2, "expected a metadata-action step per image"
    for step in meta_steps:
        assert "type=semver" in step["with"]["tags"], "must emit semver version tags"


def test_publish_job_fetches_tags():
    data, _ = _load()
    job = data["jobs"]["build-and-push"]
    checkout = next(
        s for s in job["steps"] if str(s.get("uses", "")).startswith("actions/checkout")
    )
    assert checkout.get("with", {}).get("fetch-depth") == 0, "publish needs fetch-depth: 0"