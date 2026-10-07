#!/usr/bin/env python3
"""아임웹 코드 파일이 커밋될 때 site-config.js의 dateSuffix(버전 N)와 imwebDate(수정일)를 자동 갱신.

규칙: 같은 날 그 파일이 다시 커밋되면 +1, 새 날이면 1.
- 날짜 판단은 그 파일의 '직전 커밋 날짜'를 본다(지금 커밋 직전 상태).
- 메뉴 정본(site-config.js)에서 그 파일을 imwebCode로 가진 항목의 dateSuffix·imwebDate 줄만 건드린다(없으면 넣는다).
- 운영판(index.html)이 imwebDate를 '수정일'로, dateSuffix를 '그날 N번째'로 보여준다.
- site-config.js에 아직 안 올린(스테이징 안 된) 수정이 있으면 섞이지 않게 건너뛴다.
- 고친 뒤 node로 site-config.js를 읽어 보고, 문법이 깨졌으면 되돌리고 커밋을 막는다.
설치: repo의 .git/hooks/pre-commit 에서 이 스크립트를 호출.
"""
import datetime
import os
import re
import subprocess
import sys


def sh(args):
    return subprocess.run(args, capture_output=True, text=True).stdout.strip()


def _item_end(lines, idx):
    """idx(imwebCode 줄)가 속한 항목의 닫는 괄호 줄 번호."""
    for i in range(idx + 1, len(lines)):
        if lines[i].strip().startswith("}"):
            return i
    return len(lines)


def _set_prop(lines, idx, key, value, after_key=None):
    """항목 안의 key 줄을 value로 바꾼다. 없으면 after_key 줄(없으면 imwebCode 줄) 바로 아래 넣는다.
    줄 끝 콤마는 '다음 줄이 닫는 괄호인지'로 정해서 문법이 깨지지 않게 한다."""
    indent = re.match(r"\s*", lines[idx]).group(0)
    end = _item_end(lines, idx)
    pos = next((i for i in range(idx + 1, end) if re.match(r"\s*%s:" % key, lines[i])), None)
    if pos is None:
        anchor = idx
        if after_key:
            anchor = next((i for i in range(idx + 1, end) if re.match(r"\s*%s:" % after_key, lines[i])), idx)
        if not lines[anchor].rstrip().endswith(","):
            lines[anchor] = lines[anchor].rstrip() + ","
        pos = anchor + 1
        lines.insert(pos, "")
        end += 1
    trail = "" if pos + 1 >= end else ","
    lines[pos] = "%s%s: '%s'%s" % (indent, key, value, trail)


def bump_item(lines, idx, today, same_day):
    """한 항목의 dateSuffix(+1 또는 1)와 imwebDate(today)를 맞춘다."""
    end = _item_end(lines, idx)
    cur = None
    for i in range(idx + 1, end):
        m = re.match(r"\s*dateSuffix:\s*'(\d+)'", lines[i])
        if m:
            cur = int(m.group(1))
    new_n = cur + 1 if (cur is not None and same_day) else 1
    _set_prop(lines, idx, "dateSuffix", str(new_n))
    _set_prop(lines, idx, "imwebDate", today, after_key="dateSuffix")


def config_parses(cfg):
    """node가 있으면 site-config.js가 문법 오류 없이 읽히는지 본다. node가 없으면 통과로 친다."""
    try:
        r = subprocess.run(["node", "-e", "global.window={};require(process.argv[1])", cfg], capture_output=True, text=True)
    except FileNotFoundError:
        return True
    return r.returncode == 0


def main():
    repo = sh(["git", "rev-parse", "--show-toplevel"])
    if not repo:
        return 0
    cfg = os.path.join(repo, "site-config.js")
    if not os.path.isfile(cfg):
        return 0

    staged = sh(["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"]).splitlines()
    with open(cfg, encoding="utf-8") as fh:
        original = fh.read()
    targets = [f for f in staged if f.startswith("homepage/") and f.endswith(".html") and ("imwebCode: '%s'" % f) in original]
    if not targets:
        return 0

    if subprocess.run(["git", "diff", "--quiet", "--", "site-config.js"], cwd=repo).returncode != 0:
        print("[bump-imweb-version] site-config.js에 아직 안 올린 수정이 있어 수정일 갱신을 건너뜀 — 그 수정을 먼저 올리거나 되돌린 뒤 다시 커밋하세요")
        return 0

    today = datetime.date.today().isoformat()
    lines = original.split("\n")
    for f in targets:
        needle = "imwebCode: '%s'" % f
        idx = next((i for i, line in enumerate(lines) if needle in line), None)
        if idx is None:
            continue
        last = sh(["git", "log", "-1", "--format=%cd", "--date=format:%Y-%m-%d", "--", f])
        bump_item(lines, idx, today, last == today)
        print("[bump-imweb-version] %s → 버전·수정일 갱신" % f)

    with open(cfg, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    if not config_parses(cfg):
        with open(cfg, "w", encoding="utf-8") as fh:
            fh.write(original)
        print("[bump-imweb-version] site-config.js 문법이 깨져서 되돌렸어요 — 커밋을 멈춥니다", file=sys.stderr)
        return 1
    subprocess.run(["git", "add", cfg])
    return 0


if __name__ == "__main__":
    sys.exit(main())
