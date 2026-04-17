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
from extract_and_analyze import (
    strip_html,
    tag_diff,
    build_timeline,
    compute_impact_score,
    impact_level,
    build_model_stats,
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

    def test_content_raw_is_raw_content(self):
        versions = self._make_versions("old", "<p>new content</p>")
        timeline = build_timeline(versions)
        self.assertEqual(timeline[0]["content_raw"], "<p>new content</p>")

    def test_content_snapshot_is_stripped(self):
        versions = self._make_versions("old", "<p>new content</p>")
        timeline = build_timeline(versions)
        self.assertEqual(timeline[0]["content_snapshot"], "new content")

    def test_prompt_length_matches_snapshot(self):
        versions = self._make_versions("old", "<p>new content</p>")
        timeline = build_timeline(versions)
        entry = timeline[0]
        self.assertEqual(entry["prompt_length"], len(entry["content_snapshot"]))

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
        self.assertIn(timeline[0]["impact_level"], {"low", "medium", "high"})

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


if __name__ == "__main__":
    unittest.main()
