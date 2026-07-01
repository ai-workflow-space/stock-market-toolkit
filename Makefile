# Convenience targets for the local feat-test stack.
#
# Docker Compose cannot run git itself, so a plain
# `docker compose -f docker-compose.feat-test.yml up --build` bakes the
# sentinel values into the frontend (version "vunknown", commit "local").
# These targets inject the real version, commit, and build time from git so
# the login page / dashboard / footer show them.

COMPOSE_FEAT_TEST := docker compose -f docker-compose.feat-test.yml

.PHONY: feat-test feat-test-down

## feat-test: build + run the feat-test stack with real version/commit injected
feat-test:
	VITE_APP_VERSION="$$(git describe --tags --abbrev=0 2>/dev/null || echo unknown)" \
	VITE_GIT_SHA="$$(git rev-parse --short HEAD)" \
	VITE_BUILD_TIME="$$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
	$(COMPOSE_FEAT_TEST) up --build

## feat-test-down: stop and remove the feat-test stack
feat-test-down:
	$(COMPOSE_FEAT_TEST) down
