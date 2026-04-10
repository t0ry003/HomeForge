#!/usr/bin/env python3
"""Report and optionally prune unused BibTeX entries from a .bib file.

This scans TeX sources for explicit citation commands and compares them with
all entry keys in the bibliography.

Examples:
  python3 scripts/bib_unused.py --tex-root . --bib referinte/referinte.bib
  python3 scripts/bib_unused.py --tex-root . --bib referinte/referinte.bib --prune build/referinte.pruned.bib
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Iterable

CITE_RE = re.compile(r"\\(?:cite[a-zA-Z*]*|nocite)\s*(?:\[[^\]]*\]\s*)*\{([^}]*)\}")
ENTRY_RE = re.compile(r"^@(?P<type>[A-Za-z]+)\s*\{\s*(?P<key>[^,\s]+)\s*,", re.M)


def iter_tex_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.tex"):
        if any(part in {"build", ".git", ".vscode", "_minted-teza"} for part in path.parts):
            continue
        yield path


def collect_cited_keys(root: Path) -> set[str]:
    cited: set[str] = set()
    for tex_file in iter_tex_files(root):
        content = tex_file.read_text(encoding="utf-8", errors="ignore")
        for match in CITE_RE.finditer(content):
            keys = [key.strip() for key in match.group(1).split(",")]
            for key in keys:
                if key and key != "*":
                    cited.add(key)
    return cited


def parse_bib_entries(bib_text: str) -> list[tuple[str, str]]:
    matches = list(ENTRY_RE.finditer(bib_text))
    entries: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(bib_text)
        entries.append((match.group("key"), bib_text[start:end].rstrip() + "\n\n"))
    return entries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tex-root", type=Path, required=True, help="Root folder containing TeX sources")
    parser.add_argument("--bib", type=Path, required=True, help="Input .bib file")
    parser.add_argument("--prune", type=Path, help="Write a pruned .bib with only cited entries")
    args = parser.parse_args()

    cited = collect_cited_keys(args.tex_root)
    bib_text = args.bib.read_text(encoding="utf-8")
    entries = parse_bib_entries(bib_text)
    bib_keys = [key for key, _ in entries]
    unused = [key for key in bib_keys if key not in cited]

    if unused:
        print("Unused bibliography keys:")
        for key in unused:
            print(key)
    else:
        print("No unused bibliography keys found.")

    if args.prune:
        used_entries = [entry_text for key, entry_text in entries if key in cited]
        args.prune.parent.mkdir(parents=True, exist_ok=True)
        args.prune.write_text("".join(used_entries).rstrip() + "\n", encoding="utf-8")
        print(f"Pruned bibliography written to {args.prune}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
