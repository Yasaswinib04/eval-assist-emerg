"""Validate AGENTS.md against actual codebase structure. Detects drift."""

import os
import re
import sys
from pathlib import Path


def root():
    return Path(__file__).resolve().parent.parent


def actual_routers():
    d = root() / "backend" / "routers"
    return sorted(f.name for f in d.iterdir() if f.suffix == ".py" and f.name != "__init__.py")


def actual_models():
    d = root() / "backend" / "models"
    return sorted(f.name for f in d.iterdir() if f.suffix == ".py" and f.name != "__init__.py")


def actual_pages():
    d = root() / "frontend" / "src" / "pages"
    return sorted(f.name for f in d.iterdir() if f.suffix == ".jsx")


def actual_env_vars():
    config_path = root() / "backend" / "core" / "config.py"
    text = config_path.read_text()
    return sorted(set(re.findall(r"(\w+)\s*(?::\s*\w+\s*=|=\s*os\.getenv)", text)))


def actual_collections():
    routers_dir = root() / "backend" / "routers"
    collections = set()
    for f in routers_dir.iterdir():
        if f.suffix == ".py":
            text = f.read_text()
            found = re.findall(r'db\[["\'](\w+)["\']\]', text)
            collections.update(found)
    return sorted(collections)


def documented_routers(text):
    """Extract .py filenames from the Routers section parenthetical list."""
    m = re.search(r'### Routers.*?\n.*?\(([^)]+)\)', text)
    if not m:
        return set()
    files = re.findall(r'(\w+\.py)', m.group(1))
    return set(files)


def documented_models(text):
    """Extract .py filenames from the Pydantic Models section parenthetical list."""
    m = re.search(r'### Pydantic Models.*?\n.*?\(([^)]+)\)', text)
    if not m:
        return set()
    files = re.findall(r'(\w+\.py)', m.group(1))
    return set(files)


def documented_env_vars(text):
    """Extract ALL_CAPS env var names from the Config section."""
    m = re.search(r'### Config\n(.*?)\n(.*?)\n', text)
    if not m:
        return set()
    section = m.group(1) + "\n" + m.group(2)
    vars_found = set(re.findall(r'`([A-Z][A-Z_]+)`', section))
    return vars_found


def documented_collections(text):
    """Extract collection names from the Database section."""
    m = re.search(r'Collection names:\s*`([^`]+(?:`, `[^`]+)*)`', text)
    if not m:
        return set()
    names = re.findall(r'`(\w+)`', m.group(0))
    return set(names)


def check_drift():
    agents = (root() / "AGENTS.md").read_text()
    issues = []

    # Routers
    actual = set(actual_routers())
    documented = documented_routers(agents)
    if missing := actual - documented:
        issues.append(f"New router files not in AGENTS.md: {sorted(missing)}")
    if stale := documented - actual:
        issues.append(f"Stale router files in AGENTS.md (deleted from codebase): {sorted(stale)}")

    # Models
    actual_m = set(actual_models())
    documented_m = documented_models(agents)
    if missing := actual_m - documented_m:
        issues.append(f"New model files not in AGENTS.md: {sorted(missing)}")
    if stale := documented_m - actual_m:
        issues.append(f"Stale model files in AGENTS.md (deleted from codebase): {sorted(stale)}")

    # Pages — AGENTS.md doesn't enumerate pages individually, so only flag new additions
    actual_p = set(actual_pages())
    issues.append(f"Current page files (verify AGENTS.md is up to date): {sorted(actual_p)}")

    # Env vars
    actual_e = set(actual_env_vars())
    documented_e = documented_env_vars(agents)
    if missing := actual_e - documented_e:
        issues.append(f"New env vars not in AGENTS.md: {sorted(missing)}")
    if stale := documented_e - actual_e:
        issues.append(f"Stale env vars in AGENTS.md: {sorted(stale)}")

    # Collections
    actual_c = set(actual_collections())
    documented_c = documented_collections(agents)
    if missing := actual_c - documented_c:
        issues.append(f"New DB collections not in AGENTS.md: {sorted(missing)}")

    return issues


if __name__ == "__main__":
    issues = check_drift()
    drift = [i for i in issues if not i.startswith("Current page files")]

    if drift:
        print("## AGENTS.md drift detected\n")
        for i in issues:
            print(f"- {i}")
        print(f"\n**Drift items:** {len(drift)}")
        sys.exit(1)
    else:
        print("AGENTS.md is in sync with the codebase.\n")
        for i in issues:
            print(f"- {i}")
        sys.exit(0)
