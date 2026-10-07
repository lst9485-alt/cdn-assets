import importlib.util
import subprocess
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("bump", Path(__file__).resolve().parent.parent / "bump-imweb-version.py")
bump = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bump)


def _parses(text, tmp_path):
    p = tmp_path / "c.js"
    p.write_text("window.X={a:[\n" + text + "\n]};", encoding="utf-8")
    return subprocess.run(["node", "-e", "global.window={};require(process.argv[1])", str(p)]).returncode == 0


def test_existing_suffix_and_date_keep_commas(tmp_path):
    lines = ["  {", "    imwebCode: 'a.html',", "    dateSuffix: '4',", "    imwebDate: '2026-10-01'", "  },", "  {", "    imwebCode: 'b.html'", "  }"]
    bump.bump_item(lines, 1, "2026-10-07", True)
    assert lines[2:4] == ["    dateSuffix: '5',", "    imwebDate: '2026-10-07'"]
    assert _parses("\n".join(lines), tmp_path)


def test_new_day_resets_to_one(tmp_path):
    lines = ["  {", "    imwebCode: 'a.html',", "    dateSuffix: '4',", "    imwebDate: '2026-10-01'", "  }"]
    bump.bump_item(lines, 1, "2026-10-07", False)
    assert lines[2] == "    dateSuffix: '1',"


def test_missing_fields_are_inserted_with_valid_commas(tmp_path):
    lines = ["  {", "    id: 'x',", "    imwebCode: 'footer.html'", "  }"]
    bump.bump_item(lines, 2, "2026-10-07", False)
    assert lines[2:5] == ["    imwebCode: 'footer.html',", "    dateSuffix: '1',", "    imwebDate: '2026-10-07'"]
    assert _parses("\n".join(lines), tmp_path)


def test_date_not_right_below_is_replaced_not_duplicated(tmp_path):
    lines = ["  {", "    imwebCode: 'a.html',", "    imwebDate: '2026-10-01',", "    dateSuffix: '2'", "  }"]
    bump.bump_item(lines, 1, "2026-10-07", True)
    assert sum(1 for line in lines if "imwebDate" in line) == 1
    assert "    dateSuffix: '3'" in lines
    assert _parses("\n".join(lines), tmp_path)


def test_whole_site_config_still_parses_after_bumping_every_item(tmp_path):
    cfg = Path(__file__).resolve().parents[2] / "site-config.js"
    lines = cfg.read_text(encoding="utf-8").split("\n")
    for code_line in [x for x in lines if "imwebCode: '" in x]:
        idx = lines.index(code_line)
        bump.bump_item(lines, idx, "2026-10-07", True)
    out = tmp_path / "site-config.js"
    out.write_text("\n".join(lines), encoding="utf-8")
    assert bump.config_parses(str(out))
