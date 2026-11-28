import json
import tempfile
import unittest
from pathlib import Path

from scripts import ralph_style


class TestRalphStyleLoop(unittest.TestCase):
    def test_discover_styles_includes_builtins(self):
        styles, aliases = ralph_style.discover_styles()
        self.assertIn("default", styles)
        self.assertIn("chalkboard-explainer", styles)
        self.assertIn("motion-explainer", styles)
        self.assertEqual(aliases["chalkboad-explainer"], "chalkboard-explainer")

    def test_validate_mode_requires_clarification_when_omitted(self):
        res = ralph_style.validate_mode_and_style(None, None)
        self.assertFalse(res["ok"])
        self.assertEqual(res["status"], "needs_clarification")
        self.assertIn("motion-explainer", res["available_styles"])

    def test_validate_enhance_rejects_unknown_style_without_hallucinating(self):
        res = ralph_style.validate_mode_and_style("enhance", "nonexistent-neon-style")
        self.assertFalse(res["ok"])
        self.assertEqual(res["status"], "unknown_style")
        self.assertEqual(res["requested_style"], "nonexistent-neon-style")
        self.assertIn("motion-explainer", res["available_styles"])
        self.assertNotIn("style", res)

    def test_validate_enhance_accepts_existing_style_and_alias(self):
        res = ralph_style.validate_mode_and_style("enhance", "chalkboad-explainer")
        self.assertTrue(res["ok"])
        self.assertEqual(res["mode"], "enhance")
        self.assertEqual(res["style"], "chalkboard-explainer")

    def test_validate_new_rejects_collision_with_existing_style(self):
        res = ralph_style.validate_mode_and_style("new", "motion-explainer")
        self.assertFalse(res["ok"])
        self.assertEqual(res["status"], "style_already_exists")

    def test_parse_clip_range(self):
        self.assertEqual(ralph_style.parse_clip_range("10-45"), (10.0, 45.0))
        self.assertEqual(ralph_style.parse_clip_range("01:05-02:30"), (65.0, 150.0))
        with self.assertRaises(ValueError):
            ralph_style.parse_clip_range("50-10")

    def test_compute_fidelity_gate_pass_and_fail_conditions(self):
        good_cmp = {"score": 0.975, "place": 0.98, "shape": 0.97, "offset": {"seconds": 0.05}}
        good_qa = {"overflow": [], "jitter": []}
        good_sfx = {"ok": True, "count": 12, "collisions": [], "cut_coverage": 1.0}

        ok = ralph_style.compute_fidelity_gate(good_cmp, good_qa, good_sfx, [], threshold=97.0)
        self.assertTrue(ok["passed"])
        self.assertEqual(ok["visual_score_pct"], 97.5)

        low_vis = ralph_style.compute_fidelity_gate({"score": 0.962, "place": 0.97, "shape": 0.95}, good_qa, good_sfx, [])
        self.assertFalse(low_vis["passed"])
        self.assertFalse(low_vis["gates"]["visual_score_ge_threshold"])

        missing = ralph_style.compute_fidelity_gate(good_cmp, good_qa, good_sfx, ["code/editor scene type"])
        self.assertFalse(missing["passed"])
        self.assertFalse(missing["gates"]["zero_missing_scene_types"])

        bad_qa = ralph_style.compute_fidelity_gate(good_cmp, {"overflow": [{"scene": "s001"}], "jitter": []}, good_sfx, [])
        self.assertFalse(bad_qa["passed"])
        self.assertFalse(bad_qa["gates"]["zero_qa_overflow"])

        bad_sfx = ralph_style.compute_fidelity_gate(good_cmp, good_qa, {"ok": False, "count": 0}, [])
        self.assertFalse(bad_sfx["passed"])
        self.assertFalse(bad_sfx["gates"]["sfx_sync_ok"])

        bad_lag = ralph_style.compute_fidelity_gate({"score": 0.98, "place": 0.98, "shape": 0.98, "offset": {"seconds": 0.5}}, good_qa, good_sfx, [])
        self.assertFalse(bad_lag["passed"])
        self.assertFalse(bad_lag["gates"]["timing_lag_le_025s"])

    def test_check_sfx_sync_and_missing_scene_types(self):
        with tempfile.TemporaryDirectory() as tmp:
            td = Path(tmp)
            sfx_p = td / "sfx_track.json"
            sc_p = td / "scenes.json"
            sc_p.write_text(
                json.dumps([
                    {"id": "s001", "start": 0.0, "end": 3.0, "type": "me_title"},
                    {"id": "s002", "start": 3.0, "end": 6.0, "type": "me_outro"},
                ]),
                encoding="utf-8",
            )
            sfx_p.write_text(
                json.dumps([
                    {"type": "pop", "at": 0.2, "vol": 0.7},
                    {"type": "whoosh", "at": 3.05, "vol": 0.5},
                ]),
                encoding="utf-8",
            )
            res = ralph_style._check_sfx_sync(sfx_p, sc_p, {"sfx_events": [{"t": 0.2}]})
            self.assertTrue(res["ok"])
            self.assertEqual(res["cut_coverage"], 1.0)

            # Collision < 70ms fails
            sfx_p.write_text(
                json.dumps([
                    {"type": "pop", "at": 3.0, "vol": 0.7},
                    {"type": "ding", "at": 3.03, "vol": 0.8},
                ]),
                encoding="utf-8",
            )
            bad = ralph_style._check_sfx_sync(sfx_p, sc_p, {})
            self.assertFalse(bad["ok"])
            self.assertEqual(len(bad["collisions"]), 1)

        missing = ralph_style._detect_missing_scene_types(
            {"shot_count": 6, "categories": ["code", "chart"], "shots": []},
            [{"type": "me_title"}, {"type": "me_outro"}],
        )
        self.assertIn("code/editor scene type", missing)
        self.assertIn("chart/metric comparison scene type", missing)

    def test_scaffold_preset_in_isolated_temp_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake_root = Path(tmp)
            bp = {"ground_colors": ["#101218"], "drawn_colors": ["#ff5533"]}
            info = ralph_style.scaffold_preset("dark-tech-clone", blueprint=bp, engine_root=fake_root)
            pdir = Path(info["preset_dir"])
            self.assertTrue((pdir / "renderer.mjs").is_file())
            self.assertTrue((pdir / "style.css").is_file())
            self.assertTrue((pdir / "anim.js").is_file())
            self.assertTrue((pdir / "sfx.js").is_file())
            self.assertTrue((pdir / "schema.py").is_file())
            self.assertTrue(Path(info["doc_path"]).is_file())
            self.assertTrue(Path(info["test_path"]).is_file())
            self.assertIn("#101218", (pdir / "style.css").read_text(encoding="utf-8"))
            self.assertIn("#ff5533", (pdir / "style.css").read_text(encoding="utf-8"))

            styles, _ = ralph_style.discover_styles(fake_root)
            self.assertIn("dark-tech-clone", styles)


if __name__ == "__main__":
    unittest.main()
