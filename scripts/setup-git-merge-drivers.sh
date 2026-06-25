#!/usr/bin/env bash
# Registers the repo-local "ours" merge driver used by .gitattributes.
#
# WHY THIS IS NEEDED:
#   `merge=ours` in .gitattributes is NOT a built-in git driver — it only
#   names a driver that must be wired to a command. Without this registration
#   the .gitattributes lines silently do nothing and conflict-prone files
#   (package-lock.json, CHANGELOG.md, .release-please-manifest.json) fall back
#   to the default 3-way merge. Driver config lives in .git/config, which is
#   NOT committed, so it must be (re)applied per clone — that is what this
#   script does. It is idempotent and runs automatically via `npm install`
#   (see the "prepare" script in package.json).
#
# SCOPE NOTE: custom merge drivers run only during LOCAL merge/rebase. GitHub's
#   server-side "Merge" button and mergeability check do NOT execute them, so a
#   stale branch may still be reported as conflicting in the UI — but once you
#   rebase locally (or via the merge queue runner), these files auto-resolve to
#   "ours" instead of leaving conflict markers.
set -euo pipefail

# Skip silently when not inside a git work tree (e.g. Docker build context).
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

git config merge.ours.driver true
echo "[setup-git-merge-drivers] registered merge.ours.driver=true (repo-local)"
