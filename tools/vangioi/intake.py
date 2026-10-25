#!/usr/bin/env python3
"""Offline inspection of V0.1 authoring files. No persistence or game authority."""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys

SOURCE = Path(__file__).resolve().parents[2] / 'contracts/vangioi/source-v0.1'
MAX_BYTES = 2 * 1024 * 1024
MAX_DEPTH = 64
MAX_NODES = 100_000


class IntakeError(ValueError):
    pass


def _unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise IntakeError('JSON có khóa lặp; không tự chọn giá trị đầu/cuối.')
        result[key] = value
    return result


def _constant(_):
    raise IntakeError('JSON không được chứa NaN hoặc Infinity.')


def _limits(value):
    pending, count = [(value, 0)], 0
    while pending:
        node, depth = pending.pop()
        count += 1
        if depth > MAX_DEPTH or count > MAX_NODES:
            raise IntakeError('JSON vượt giới hạn độ sâu/số phần tử của công cụ nhập.')
        if isinstance(node, float) and not math.isfinite(node):
            raise IntakeError('JSON có số vượt miền hữu hạn.')
        if isinstance(node, dict):
            pending.extend((v, depth + 1) for v in node.values())
        elif isinstance(node, list):
            pending.extend((v, depth + 1) for v in node)


def parse(raw: bytes):
    if len(raw) > MAX_BYTES:
        raise IntakeError('JSON vượt 2 MiB; đây là giới hạn công cụ, không phải quota bậc.')
    try:
        data = json.loads(raw.decode('utf-8-sig'), object_pairs_hook=_unique_pairs,
                          parse_constant=_constant)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise IntakeError('Không đọc được JSON UTF-8 hợp lệ.') from exc
    _limits(data)
    return data


def _schema_validator():
    try:
        from jsonschema import Draft202012Validator
    except ImportError as exc:
        raise IntakeError('Thiếu jsonschema; cài tools/vangioi/requirements.txt. Không bỏ qua schema.') from exc
    schema = json.loads((SOURCE / 'world.schema.json').read_text(encoding='utf-8'))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def _legacy_checker():
    spec = importlib.util.spec_from_file_location('vangioi_source_v01', SOURCE / 'validate_world.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.check


def inspect(raw: bytes):
    data = parse(raw)
    result = {
        'reportVersion': 'vangioi-intake-0.1',
        'sourceSha256': hashlib.sha256(raw).hexdigest(),
        'validForOfflineDraft': False,
        'authoritative': False,
        'canPublish': False,
        'canEnterWorld': False,
        'canGrantRewards': False,
        'errors': [], 'warnings': [], 'conflicts': [],
        'normalizedMetadata': None,
    }
    validator = _schema_validator()
    for error in validator.iter_errors(data):
        pointer = '/' + '/'.join(str(p).replace('~', '~0').replace('/', '~1') for p in error.path)
        # Do not echo author prose or secretTruth into terminal diagnostics.
        result['errors'].append({'code': 'schema', 'path': pointer,
                                 'rule': error.validator})
    if result['errors']:
        return result

    # Source status, author/asset approval and entry claims are untrusted.
    # Check references in draft mode; this tool cannot certify release rights.
    draft = copy.deepcopy(data)
    draft['status'] = 'draft'
    semantic = _legacy_checker()(draft)
    result['errors'].extend({'code': 'semantic', 'message': msg} for msg in semantic.errors)
    for msg in semantic.warnings:
        if msg.startswith('Bậc ') or msg.startswith('Trial trước hộ chiếu'):
            continue  # Superseded V0.1 rank quotas / onboarding interpretation.
        result['warnings'].append({'code': 'legacy_advisory', 'message': msg})

    genre = data['genreId']
    if genre == 'period':
        result['conflicts'].append({'code': 'genre_alias', 'resolution': 'period -> era; giữ nguyên file nguồn'})
        genre = 'era'
    result['conflicts'].append({'code': 'rank_is_request',
        'resolution': 'worldRank chỉ là đề nghị; officialWorldRank vẫn null'})
    if data['status'] != 'draft':
        result['conflicts'].append({'code': 'untrusted_workflow_claim',
            'resolution': 'Nhãn duyệt/phát hành trong JSON không có hiệu lực backend'})
    if any(asset['assetStatus'] == 'approved' for asset in data['assets']):
        result['conflicts'].append({'code': 'untrusted_asset_approval',
            'resolution': 'Phải duyệt asset từ backend, không tin nhãn trong file nhập'})
    if data['entry']['trialInstance'] or not data['entry']['passportRequired']:
        result['conflicts'].append({'code': 'entry_policy_requires_review',
            'resolution': 'Không tự map trial V0.1 sang ba F khảo hạch hoặc bỏ cổng hộ chiếu'})
    if any('[TODO]' in text for text in _strings(data)):
        result['warnings'].append({'code': 'incomplete_draft',
            'message': 'Bản nháp còn TODO; không đủ điều kiện gửi duyệt'})
    # This is an intake proposal only, never an authenticated owner or grant.
    result['normalizedMetadata'] = {
        'worldId': data['worldId'], 'genreId': genre,
        'contentVersion': data['contentVersion'],
        'requestedWorldRank': data['worldRank'], 'officialWorldRank': None,
        'workflowState': 'draft', 'ownerVerified': False,
        'assetApprovalsVerified': False, 'requiresBackendEntryGrant': True,
    }
    result['validForOfflineDraft'] = not result['errors']
    return result


def _strings(data):
    pending = [data]
    while pending:
        value = pending.pop()
        if isinstance(value, str):
            yield value
        elif isinstance(value, dict):
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)


def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print('Usage: python tools/vangioi/intake.py path/to/world.json', file=sys.stderr)
        return 2
    try:
        with Path(args[0]).open('rb') as stream:
            raw = stream.read(MAX_BYTES + 1)
        result = inspect(raw)
    except (IntakeError, OSError) as exc:
        message = str(exc) if isinstance(exc, IntakeError) else 'Không mở được tệp nguồn.'
        print(json.dumps({'error': message}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['validForOfflineDraft'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
