import argparse
import subprocess
import sys
from pathlib import Path


def get_version() -> str:
    version_path = Path(__file__).parent / "VERSION"
    return version_path.read_text().strip()


def get_git_sha() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except subprocess.CalledProcessError:
        return "unknown"


def main() -> None:
    parser = argparse.ArgumentParser(description="Stock Market Toolkit")
    parser.add_argument(
        "--version",
        action="store_true",
        help="Print version and exit",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    subparsers.add_parser("ping", help="Health-check: prints OK and git SHA")

    args, _ = parser.parse_known_args()

    if args.version:
        print(f"v{get_version()}")
        sys.exit(0)

    if args.command == "ping":
        sha = get_git_sha()
        print(f"OK {sha}")
        sys.exit(0)


if __name__ == "__main__":
    main()
