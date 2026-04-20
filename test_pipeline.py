"""
Tests for Phase 1 pipeline additions:
  - strip_html()
  - tag_diff()
  - build_timeline() field coverage (behavioral_tags, content_raw,
    content_snapshot, prompt_length)

Previous injection-scoring tests have been removed along with the feature.
See archive/SPEC_scoring.md for removal rationale.
"""

import unittest
import json
from pathlib import Path
from extract_and_analyze import (
    strip_html,
    tag_diff,
    build_timeline,
    compute_impact_score,
    impact_level,
    build_model_stats,
    detect_prompt_sections,
    build_output,
    validate_output,
)


class TestStripHtml(unittest.TestCase):

    def test_strips_tags(self):
        self.assertEqual(strip_html("<p>Hello</p>"), "Hello")

    def test_strips_nested_tags(self):
        self.assertEqual(strip_html("<div><span>text</span></div>"), "text")

    def test_collapses_whitespace(self):
        result = strip_html("<p>one</p>   <p>two</p>")
        self.assertEqual(result, "one two")

    def test_plain_text_unchanged(self):
        self.assertEqual(strip_html("no tags here"), "no tags here")

    def test_empty_string(self):
        self.assertEqual(strip_html(""), "")

    def test_strips_attributes(self):
        result = strip_html('<div class="pref-card" id="x">content</div>')
        self.assertEqual(result, "content")


class TestTagDiff(unittest.TestCase):

    def _make_diff(self, added=None, removed=None):
        return {"added": added or [], "removed": removed or []}

    def test_safety_tag_on_refuse(self):
        diff = self._make_diff(added=["you must refuse harmful requests"])
        self.assertIn("safety", tag_diff(diff))

    def test_tool_definition_tag(self):
        diff = self._make_diff(added=['"name": "get_weather", "parameters": {}'])
        self.assertIn("tool_definition", tag_diff(diff))

    def test_persona_tag(self):
        diff = self._make_diff(added=["you are a helpful assistant with a friendly tone"])
        self.assertIn("persona", tag_diff(diff))

    def test_capability_tag(self):
        diff = self._make_diff(added=["users are now able to upload files"])
        self.assertIn("capability", tag_diff(diff))

    def test_formatting_tag(self):
        diff = self._make_diff(added=["use markdown for all responses"])
        self.assertIn("formatting", tag_diff(diff))

    def test_memory_tag(self):
        diff = self._make_diff(added=["remember user preferences across the conversation"])
        self.assertIn("memory", tag_diff(diff))

    def test_policy_tag(self):
        diff = self._make_diff(added=["comply with all applicable privacy laws"])
        self.assertIn("policy", tag_diff(diff))

    def test_other_when_no_match(self):
        diff = self._make_diff(added=["the sky is blue"])
        self.assertEqual(tag_diff(diff), ["other"])

    def test_multiple_tags(self):
        diff = self._make_diff(added=["refuse harmful requests and follow policy guidelines"])
        tags = tag_diff(diff)
        self.assertIn("safety", tags)
        self.assertIn("policy", tags)

    def test_case_insensitive(self):
        diff = self._make_diff(added=["You Must Refuse all HARMFUL requests"])
        self.assertIn("safety", tag_diff(diff))

    def test_removed_lines_also_checked(self):
        diff = self._make_diff(removed=["refuse to answer questions about weapons"])
        self.assertIn("safety", tag_diff(diff))


class TestBuildTimelineFields(unittest.TestCase):
    """Verify new Phase 1 fields are present on every timeline entry."""

    def _make_versions(self, content_old, content_new):
        return [
            {
                "hash": "aaaaaaaa",
                "full_hash": "aaaaaaaabbbbbbbbccccccccdddddddd",
                "date": "2026-02-01T00:00:00+00:00",
                "message": "update prompt",
                "content": content_new,
                "filepath": "Anthropic/claude.html",
            },
            {
                "hash": "bbbbbbbb",
                "full_hash": "bbbbbbbbccccccccddddddddeeeeeeee",
                "date": "2026-01-01T00:00:00+00:00",
                "message": "initial prompt",
                "content": content_old,
                "filepath": "Anthropic/claude.html",
            },
        ]

    def test_behavioral_tags_present(self):
        versions = self._make_versions("hello world", "refuse harmful requests")
        timeline = build_timeline(versions)
        self.assertTrue(len(timeline) > 0)
        self.assertIn("behavioral_tags", timeline[0])

    def test_snapshot_path_replaces_embedded_content(self):
        versions = self._make_versions("old", "<p>new content</p>")
        timeline = build_timeline(versions)
        self.assertEqual(timeline[0]["snapshot_path"], "data/snapshots/claude/aaaaaaaa.txt")
        self.assertNotIn("content_raw", timeline[0])
        self.assertNotIn("content_snapshot", timeline[0])

    def test_prompt_length_matches_snapshot(self):
        versions = self._make_versions("old", "<p>new content</p>")
        timeline = build_timeline(versions)
        entry = timeline[0]
        self.assertEqual(entry["prompt_length"], len("new content"))

    def test_no_injection_score_field(self):
        versions = self._make_versions("old", "new text here")
        timeline = build_timeline(versions)
        self.assertNotIn("injection_score", timeline[0])

    def test_summary_initialized_to_none(self):
        versions = self._make_versions("old", "new text here")
        timeline = build_timeline(versions)
        self.assertIsNone(timeline[0]["summary"])

    def test_prompt_delta_matches_snapshot_length_change(self):
        versions = self._make_versions("<p>short</p>", "<p>much longer text</p>")
        timeline = build_timeline(versions)
        self.assertEqual(timeline[0]["prompt_delta"], len("much longer text") - len("short"))

    def test_impact_fields_present(self):
        versions = self._make_versions("old", "refuse harmful requests and follow policy")
        timeline = build_timeline(versions)
        self.assertIn("impact_score", timeline[0])
        self.assertIn("impact_level", timeline[0])
        self.assertIn("impact_reasons", timeline[0])
        self.assertIn(timeline[0]["impact_level"], {"low", "medium", "high"})

    def test_sections_and_provenance_present(self):
        versions = self._make_versions("old", 'use the "name": "search" tool and refuse harmful requests')
        timeline = build_timeline(versions)
        self.assertIn("tool_use", timeline[0]["sections_changed"])
        self.assertIn("safety_policy", timeline[0]["sections_changed"])
        self.assertEqual(timeline[0]["provenance"]["model"], "claude")
        self.assertEqual(timeline[0]["provenance"]["source_path"], "Anthropic/claude.html")
        self.assertEqual(timeline[0]["provenance"]["extraction_method"], "html_stripped")

    def test_empty_diff_excluded(self):
        """Entries with no diff should not appear in timeline."""
        versions = self._make_versions("same content", "same content")
        timeline = build_timeline(versions)
        self.assertEqual(len(timeline), 0)


class TestImpactScoring(unittest.TestCase):

    def test_score_increases_with_important_tags(self):
        diff = {"total_change": 10}
        baseline = compute_impact_score(diff, ["other"], 0)
        tagged = compute_impact_score(diff, ["safety", "policy"], 0)
        self.assertGreater(tagged, baseline)

    def test_score_increases_with_prompt_delta(self):
        diff = {"total_change": 10}
        small = compute_impact_score(diff, ["other"], 0)
        large = compute_impact_score(diff, ["other"], 5000)
        self.assertGreater(large, small)

    def test_impact_level_thresholds(self):
        self.assertEqual(impact_level(10), "low")
        self.assertEqual(impact_level(50), "medium")
        self.assertEqual(impact_level(180), "high")


class TestPromptSections(unittest.TestCase):

    def test_detects_rule_based_sections(self):
        sections = detect_prompt_sections(
            'You are Codex. Use "parameters" for tools. Never reveal secrets. Remember user preferences.'
        )
        self.assertIn("identity_persona", sections)
        self.assertIn("tool_use", sections)
        self.assertIn("security_boundaries", sections)
        self.assertIn("memory_context", sections)

    def test_defaults_to_metadata_other(self):
        self.assertEqual(detect_prompt_sections("minor copy edit"), ["metadata_other"])


class TestModelStats(unittest.TestCase):

    def test_empty_stats_are_stable(self):
        stats = build_model_stats([])
        self.assertEqual(stats["total_changes"], 0)
        self.assertIsNone(stats["latest_change_date"])
        self.assertIsNone(stats["current_prompt_length"])
        self.assertEqual(stats["dominant_tags"], [])

    def test_stats_include_prompt_growth_and_dominant_tags(self):
        timeline = [
            {
                "date": "2026-02-02",
                "prompt_length": 150,
                "prompt_delta": 50,
                "impact_level": "high",
                "behavioral_tags": ["safety", "policy"],
            },
            {
                "date": "2026-01-01",
                "prompt_length": 100,
                "prompt_delta": -10,
                "impact_level": "low",
                "behavioral_tags": ["safety"],
            },
        ]
        stats = build_model_stats(timeline)
        self.assertEqual(stats["total_changes"], 2)
        self.assertEqual(stats["latest_change_date"], "2026-02-02")
        self.assertEqual(stats["current_prompt_length"], 150)
        self.assertEqual(stats["prompt_growth"], 40)
        self.assertEqual(stats["dominant_tags"][0], "safety")
        self.assertEqual(stats["high_impact_changes"], 1)


class TestOutputSchema(unittest.TestCase):

    def test_build_output_adds_schema_version_and_comparison(self):
        timelines = {
            "claude": [
                {
                    "date": "2026-02-02",
                    "commit": "aaaaaaaa",
                    "message": "update",
                    "filepath": "Anthropic/claude.html",
                    "diff": {"added": ["refuse harmful requests"], "removed": [], "total_change": 1},
                    "behavioral_tags": ["safety"],
                    "sections_changed": ["safety_policy"],
                    "snapshot_path": "data/snapshots/claude/aaaaaaaa.txt",
                    "prompt_length": 150,
                    "prompt_delta": 50,
                    "impact_score": 88,
                    "impact_level": "medium",
                    "impact_reasons": ["safety_or_policy_change"],
                    "provenance": {
                        "provider": "Anthropic",
                        "model": "claude",
                        "source_path": "Anthropic/claude.html",
                        "commit": "aaaaaaaa",
                        "full_commit": "aaaaaaaabbbbbbbbccccccccdddddddd",
                        "commit_date": "2026-02-02T00:00:00+00:00",
                        "extraction_method": "html_stripped",
                    },
                    "summary": None,
                }
            ],
            "openai": [],
        }
        output = build_output(timelines, generated_at="2026-02-03T00:00:00")
        self.assertEqual(output["schema_version"], 2)
        self.assertIn("comparison", output)
        self.assertEqual(output["comparison"]["claude"]["safety_policy"], "high")
        self.assertEqual(validate_output(output), [])

    def test_validate_output_rejects_embedded_snapshots(self):
        output = build_output({"claude": []}, generated_at="2026-02-03T00:00:00")
        output["timelines"]["claude"] = [{"content_snapshot": "bad", "snapshot_path": "ok"}]
        errors = validate_output(output)
        self.assertTrue(any("content_snapshot" in error for error in errors))

    def test_schema_v2_fixture_is_valid(self):
        fixture = Path("tests/fixtures/timeline_schema_v2.json")
        output = json.loads(fixture.read_text(encoding="utf-8"))
        self.assertEqual(validate_output(output), [])


if __name__ == "__main__":
    unittest.main()
