"""Check references for obvious problems.

Flags:
1. Sources on stub pages (<60 words) — too short to meaningfully cite anything.
2. Duplicate sources — same URL listed on multiple pages (one is likely misplaced).
3. Missing required fields — sources without title or url.
"""

import yaml
import os
import sys

content_dir = "content"
issues = []
url_pages: dict[str, list[str]] = {}

for root, dirs, files in os.walk(content_dir):
    for f in files:
        if not f.endswith(".md"):
            continue
        path = os.path.join(root, f)
        text = open(path).read()
        if not text.startswith("---"):
            continue
        parts = text.split("---", 2)
        if len(parts) < 3:
            continue
        fm = yaml.safe_load(parts[1])
        body = parts[2].strip()
        sources = fm.get("sources", [])
        if not sources:
            continue

        rel_path = os.path.relpath(path, content_dir)
        words = len(body.split())

        for s in sources:
            title = s.get("title", "")
            url = s.get("url", "")

            if not title or not url:
                issues.append(f"  {rel_path}: source missing title or url")
                continue

            url_pages.setdefault(url, []).append(rel_path)

        if words < 60:
            titles = [s.get("title", "?")[:50] for s in sources]
            issues.append(
                f"  {rel_path}: stub ({words} words) with {len(sources)} source(s): "
                + "; ".join(titles)
            )

# check for sources that appear on 3+ pages (likely misplaced somewhere)
for url, pages in url_pages.items():
    if len(pages) >= 4:
        issues.append(f"  source on {len(pages)} pages ({url}): {', '.join(pages)}")

if issues:
    print(f"found {len(issues)} issue(s):\n")
    for issue in issues:
        print(issue)
    sys.exit(1)
else:
    print("all references look good")
