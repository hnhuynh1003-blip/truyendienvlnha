import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

from intake import SOURCE, MAX_BYTES, IntakeError, inspect, parse

EXAMPLE = json.loads((SOURCE / 'world_example_F.json').read_text())


def report(data):
    return inspect(json.dumps(data, ensure_ascii=False).encode())


class IntakeTests(unittest.TestCase):
    def test_source_files_are_byte_identical(self):
        manifest = json.loads((SOURCE / 'SHA256SUMS.json').read_text())
        self.assertEqual(len(manifest), 10)
        for name, digest in manifest.items():
            self.assertEqual(hashlib.sha256((SOURCE / name).read_bytes()).hexdigest(), digest)

    def test_example_is_draft_only(self):
        r = report(EXAMPLE)
        self.assertTrue(r['validForOfflineDraft'])
        self.assertFalse(r['authoritative'])
        for key in ('canPublish', 'canEnterWorld', 'canGrantRewards'):
            self.assertFalse(r[key])

    def test_s_rank_is_not_official_or_a_quota(self):
        data = copy.deepcopy(EXAMPLE)
        data['worldRank'] = 'S'
        r = report(data)
        self.assertTrue(r['validForOfflineDraft'])
        self.assertEqual(r['normalizedMetadata']['requestedWorldRank'], 'S')
        self.assertIsNone(r['normalizedMetadata']['officialWorldRank'])
        self.assertFalse(any('Bậc S' in w.get('message', '') for w in r['warnings']))

    def test_period_alias_does_not_mutate_source(self):
        data = copy.deepcopy(EXAMPLE)
        data['genreId'] = 'period'
        raw = json.dumps(data).encode()
        before = raw[:]
        r = inspect(raw)
        self.assertEqual(r['normalizedMetadata']['genreId'], 'era')
        self.assertEqual(raw, before)
        self.assertEqual(json.loads(raw)['genreId'], 'period')

    def test_forged_published_status_and_approvals_have_no_authority(self):
        data = copy.deepcopy(EXAMPLE)
        data['status'] = 'published'
        data['author']['ownershipDeclaration'] = True
        for asset in data['assets']:
            asset['assetStatus'] = 'approved'
        r = report(data)
        self.assertEqual(r['normalizedMetadata']['workflowState'], 'draft')
        self.assertFalse(r['normalizedMetadata']['ownerVerified'])
        self.assertFalse(r['normalizedMetadata']['assetApprovalsVerified'])
        self.assertFalse(r['canPublish'])
        self.assertIn('untrusted_asset_approval', [c['code'] for c in r['conflicts']])

    def test_trial_cannot_open_entry(self):
        r = report(EXAMPLE)
        self.assertTrue(r['normalizedMetadata']['requiresBackendEntryGrant'])
        self.assertFalse(r['canEnterWorld'])
        self.assertIn('entry_policy_requires_review', [c['code'] for c in r['conflicts']])

    def test_schema_errors_do_not_crash_semantic_checker(self):
        for key in ('author', 'entry', 'missions', 'npcs', 'scenes', 'assets'):
            data = copy.deepcopy(EXAMPLE)
            data[key] = [None, {'invalid': []}]
            r = report(data)
            self.assertFalse(r['validForOfflineDraft'], key)
            self.assertIsNone(r['normalizedMetadata'])

    def test_missing_reference_is_rejected(self):
        data = copy.deepcopy(EXAMPLE)
        data['scenes'][0]['backgroundAssetId'] = 'missing-art'
        self.assertFalse(report(data)['validForOfflineDraft'])

    def test_ai_cannot_request_authority(self):
        for key in ('allowAiRewards', 'allowAiWorldMutation'):
            data = copy.deepcopy(EXAMPLE)
            data['aiPolicy'][key] = True
            self.assertFalse(report(data)['validForOfflineDraft'])

    def test_unknown_fields_cannot_inject_official_rank_or_owner(self):
        for key in ('officialWorldRank', 'ownerUid', 'aiEnabled', 'releaseId'):
            data = copy.deepcopy(EXAMPLE)
            data[key] = 'forged'
            self.assertFalse(report(data)['validForOfflineDraft'])

    def test_boolean_is_not_integer(self):
        data = copy.deepcopy(EXAMPLE)
        data['missions'][0]['rewardRequest']['exp'] = True
        self.assertFalse(report(data)['validForOfflineDraft'])

    def test_diagnostics_do_not_print_secret_truth(self):
        data = copy.deepcopy(EXAMPLE)
        data['story']['secretTruth'] = {'spoiler': 'SECRET_SENTINEL'}
        self.assertNotIn('SECRET_SENTINEL', json.dumps(report(data)))

    def test_duplicate_keys_nonfinite_and_invalid_json_rejected(self):
        for raw in (b'{"status":"draft","status":"published"}', b'{"n":NaN}',
                    b'{"n":Infinity}', b'{"n":1e999}', b'\xff', b'{'):
            with self.assertRaises(IntakeError):
                parse(raw)

    def test_tool_limits_are_enforced(self):
        for raw in (b' ' * (MAX_BYTES + 1), b'[' * 70 + b'0' + b']' * 70):
            with self.assertRaises(IntakeError):
                parse(raw)

    def test_template_can_stay_incomplete(self):
        r = inspect((SOURCE / 'world_template.json').read_bytes())
        self.assertTrue(r['validForOfflineDraft'])
        self.assertIn('incomplete_draft', [w['code'] for w in r['warnings']])
        self.assertFalse(r['canPublish'])

    def test_missing_schema_dependency_is_not_silently_skipped(self):
        env = {k: v for k, v in os.environ.items() if k not in ('PYTHONPATH', 'PYTHONHOME')}
        p = subprocess.run([sys.executable, '-S', str(Path(__file__).with_name('intake.py')),
                            str(SOURCE / 'world_example_F.json')], capture_output=True, text=True, env=env)
        self.assertEqual(p.returncode, 2)
        self.assertIn('jsonschema', p.stderr)


if __name__ == '__main__':
    unittest.main()
