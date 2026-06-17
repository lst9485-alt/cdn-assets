#!/usr/bin/env python3
"""아임웹 코드 파일이 커밋될 때 site-config.js의 dateSuffix(버전 N)를 자동 갱신.

규칙: 같은 날 그 파일이 다시 커밋되면 +1, 새 날이면 1.
- 날짜 판단은 그 파일의 '직전 커밋 날짜'를 본다(지금 커밋 직전 상태).
- 메뉴 정본(site-config.js)에서 해당 항목의 dateSuffix 줄 한 줄만 건드린다.
설치: repo의 .git/hooks/pre-commit 에서 이 스크립트를 호출.
"""
import datetime
import os
import re
import subprocess
import sys


def sh(args):
    return subprocess.run(args, capture_output=True, text=True).stdout.strip()


def main():
    repo = sh(["git", "rev-parse", "--show-toplevel"])
    if not repo:
        return 0
    cfg = os.path.join(repo, "site-config.js")
    if not os.path.isfile(cfg):
        return 0

    staged = sh(["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"]).splitlines()
    targets = [f for f in staged if re.search(r"homepage/.*imweb.*\.html$", f)]
    if not targets:
        return 0

    today = datetime.date.today().isoformat()
    with open(cfg, encoding="utf-8") as fh:
        text = fh.read()

    changed = False
    for f in targets:
        needle = "imwebCode: '%s'" % f
        if needle not in text:
            continue  # 대시보드에 안 걸린 파일은 건너뜀

        last = sh(["git", "log", "-1", "--format=%cd", "--date=format:%Y-%m-%d", "--", f])
        same_day = (last == today)

        lines = text.split("\n")
        idx = next((i for i, l in enumerate(lines) if needle in l), None)
        if idx is None:
            continue
        indent = re.match(r"\s*", lines[idx]).group(0)

        nxt = lines[idx + 1] if idx + 1 < len(lines) else ""
        m = re.match(r"\s*dateSuffix:\s*'(\d+)'", nxt)
        if m:
            new_n = int(m.group(1)) + 1 if same_day else 1
            lines[idx + 1] = "%sdateSuffix: '%d'" % (indent, new_n)
        else:
            # dateSuffix가 아직 없음 → imwebCode 줄에 콤마 붙이고 새 줄 삽입
            if not lines[idx].rstrip().endswith(","):
                lines[idx] = lines[idx].rstrip() + ","
            lines.insert(idx + 1, "%sdateSuffix: '1'" % indent)

        text = "\n".join(lines)
        changed = True
        print("[bump-imweb-version] %s → 버전 갱신" % f)

    if changed:
        with open(cfg, "w", encoding="utf-8") as fh:
            fh.write(text)
        subprocess.run(["git", "add", cfg])
    return 0


if __name__ == "__main__":
    sys.exit(main())
