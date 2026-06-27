import { describe, it, expect } from "vitest";
import { normalizeVersion } from "./version";

describe("normalizeVersion", () => {
  it("strips a leading v from a tag-style version", () => {
    // CI injects the release tag verbatim (e.g. "v0.9.2"); the "v" prefix is
    // re-added when building release URLs, so the bare form must not keep it —
    // otherwise the link doubles to ".../releases/tag/vv0.9.2" and 404s.
    expect(normalizeVersion("v0.9.2")).toBe("0.9.2");
  });
  it("leaves a bare semver untouched", () => {
    expect(normalizeVersion("0.4.0")).toBe("0.4.0");
  });
});
