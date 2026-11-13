"""Regression checks for the preflight validator (stdlib unittest)."""

import copy
import json
import unittest
from pathlib import Path

from validate_world import check


EXAMPLE = json.loads(Path(__file__).with_name("world_example_F.json").read_text(encoding="utf-8"))


class WorldValidatorTests(unittest.TestCase):
    def test_example_draft_is_structurally_valid(self):
        result = check(EXAMPLE)
        self.assertEqual(result.errors, [])
        self.assertGreater(len(EXAMPLE["cast"]), len(EXAMPLE["npcs"]))
        self.assertEqual({p["mode"] for p in EXAMPLE["playerEntryProfiles"]},
                         {"cast_possession", "system_cover", "native_extra"})

    def test_mentioned_character_needs_no_npc_record(self):
        world = copy.deepcopy(EXAMPLE)
        world["cast"].append({"characterId": "char-nhan-vat-chi-duoc-ke", "displayName": "Một người chỉ được kể", "narrativeRole": "mentioned", "presence": "mention_only"})
        self.assertEqual(check(world).errors, [])

    def test_visuals_are_not_mandatory_for_every_cast_or_npc(self):
        world = copy.deepcopy(EXAMPLE)
        world["characterVisuals"] = []
        world["characterAppearances"] = []
        self.assertEqual(check(world).errors, [])
        self.assertGreater(len(world["cast"]), len(world["characterVisuals"]))

    def test_character_visual_appearance_is_distinct_from_npc(self):
        world = copy.deepcopy(EXAMPLE)
        world["cast"].append({"characterId": "char-khach-qua-duong", "displayName": "Khách thoáng qua", "narrativeRole": "cameo", "presence": "onstage"})
        world["assets"].append({"assetId": "asset-khach-qua-duong", "kind": "characterSprite", "assetStatus": "pending", "license": "unknown", "sourceNote": "Ảnh chọn sau", "altText": "Một khách qua đường"})
        world["characterVisuals"].append({"characterId": "char-khach-qua-duong", "visualPriority": "cameo", "identityNotes": "Chỉ thoáng thấy", "fixedTraits": ["lớn tuổi"], "variants": [{"variantId": "look-khach", "assetId": "asset-khach-qua-duong", "format": "sprite"}]})
        world["characterAppearances"].append({"appearanceId": "appearance-khach-qua", "characterId": "char-khach-qua-duong", "viewId": "view-toan-ben", "variantId": "look-khach", "displayMode": "sprite", "showOn": "scene_enter", "hideOn": "view_exit"})
        self.assertEqual(check(world).errors, [])
        self.assertFalse(any(n.get("characterId") == "char-khach-qua-duong" for n in world["npcs"]))

    def test_appearance_rejects_variant_from_different_character(self):
        world = copy.deepcopy(EXAMPLE)
        world["characterAppearances"][0]["variantId"] = "look-chu-quan-cuoi"
        self.assertTrue(any("thuộc nhân vật khác" in e for e in check(world).errors))

    def test_character_asset_must_match_portrait_or_sprite_type(self):
        world = copy.deepcopy(EXAMPLE)
        world["characterVisuals"][0]["variants"][0]["assetId"] = "asset-bg-ben-song"
        self.assertTrue(any("kind ảnh không khớp" in e for e in check(world).errors))

    def test_appearance_dialogue_trigger_must_exist(self):
        world = copy.deepcopy(EXAMPLE)
        world["characterAppearances"][0]["triggerRef"] = "dlg-chua-viet"
        self.assertTrue(any("dlg-chua-viet" in e for e in check(world).errors))

    def test_possessed_character_cannot_render_as_other_npc_sprite(self):
        world = copy.deepcopy(EXAMPLE)
        world["characterVisuals"][0]["characterId"] = "char-lu-khach"
        world["characterAppearances"][0]["characterId"] = "char-lu-khach"
        world["characterAppearances"][0]["suppressWhenPossessed"] = False
        self.assertTrue(any("cast_possession" in e for e in check(world).errors))
        world["characterAppearances"][0]["suppressWhenPossessed"] = True
        self.assertEqual(check(world).errors, [])

    def test_composed_illustration_characters_do_not_need_npcs(self):
        world = copy.deepcopy(EXAMPLE)
        world["views"][3]["depictedCharacterIds"] = ["char-lai-do", "char-lu-khach"]
        self.assertEqual(check(world).errors, [])
        world["views"][3]["depictedCharacterIds"].append("char-khong-co")
        self.assertTrue(any("char-khong-co" in e for e in check(world).errors))

    def test_environment_only_world_needs_no_npc_quota(self):
        world = copy.deepcopy(EXAMPLE)
        world["npcs"] = []
        world["characterAppearances"] = []
        world["shops"] = []
        world["views"][0]["hotspots"] = []
        world["views"][2]["hotspots"] = []
        world["missions"][0]["objectives"] = [o for o in world["missions"][0]["objectives"] if o["verb"] != "talk"]
        world["items"][2]["acquisitionMethods"] = [{"type": "pickup", "placeId": "ben-song", "uniquePickupId": "pickup-nen-suong"}]
        world["playRequirements"]["requiredInteractNpcIds"] = []
        world["aiPolicy"]["aiNpcRequested"] = False
        self.assertEqual(check(world).errors, [])

    def test_one_map_can_have_many_views_in_same_scene(self):
        self.assertEqual(len(EXAMPLE["maps"]), 1)
        self.assertEqual(len(EXAMPLE["scenes"]), 2)
        self.assertEqual(len(EXAMPLE["views"]), 4)
        self.assertEqual(check(EXAMPLE).errors, [])

    def test_rank_s_does_not_fail_for_small_number_of_places(self):
        world = copy.deepcopy(EXAMPLE)
        world["worldRank"] = "S"
        result = check(world)
        self.assertEqual(result.errors, [])
        self.assertFalse(any("địa điểm" in w for w in result.warnings))

    def test_focus_cannot_change_scene_silently(self):
        world = copy.deepcopy(EXAMPLE)
        world["views"][0]["hotspots"][1]["targetId"] = "view-khoang-do"
        self.assertTrue(any("phải dùng move" in e for e in check(world).errors))

    def test_text_pickup_hotspot_has_item_and_idempotency_key(self):
        world = copy.deepcopy(EXAMPLE)
        hotspot = world["views"][1]["hotspots"][0]
        self.assertEqual(hotspot["presentation"], "text")
        self.assertEqual(hotspot["action"], "pickup")
        hotspot["targetId"] = "item-khong-ton-tai"
        self.assertTrue(any("item-khong-ton-tai" in e for e in check(world).errors))

    def test_fixed_role_must_select_existing_profile(self):
        world = copy.deepcopy(EXAMPLE)
        world["entryPolicy"] = {"mode": "fixed", "forcedEntryId": "entry-khong-co"}
        self.assertTrue(any("entry-khong-co" in e for e in check(world).errors))

    def test_cast_entry_requires_valid_playable_character(self):
        world = copy.deepcopy(EXAMPLE)
        world["playerEntryProfiles"][0]["castTargetId"] = "char-nguoi-don"
        self.assertTrue(any("playableAsCast" in e for e in check(world).errors))

    def test_duplicate_npc_rejected(self):
        world = copy.deepcopy(EXAMPLE)
        world["npcs"].append(copy.deepcopy(world["npcs"][0]))
        self.assertTrue(any("trùng ID" in e for e in check(world).errors))

    def test_missing_background_reference_rejected(self):
        world = copy.deepcopy(EXAMPLE)
        world["scenes"][0]["backgroundAssetId"] = "missing-art"
        self.assertTrue(any("missing-art" in e for e in check(world).errors))

    def test_non_main_mission_cannot_be_required(self):
        world = copy.deepcopy(EXAMPLE)
        world["missions"][0]["kind"] = "hidden"
        self.assertTrue(any("side/hidden" in e for e in check(world).errors))

    def test_publish_requires_approved_assets_and_rights(self):
        world = copy.deepcopy(EXAMPLE)
        world["status"] = "published"
        result = check(world)
        self.assertTrue(any("quyền nội dung" in e for e in result.errors))
        self.assertTrue(any("Asset" in e for e in result.errors))

    def test_ai_authority_cannot_be_escalated(self):
        world = copy.deepcopy(EXAMPLE)
        world["aiPolicy"]["allowAiRewards"] = True
        self.assertTrue(any("AI không được" in e for e in check(world).errors))

    def test_grade_shortfall_warns_but_does_not_autoreject(self):
        world = copy.deepcopy(EXAMPLE)
        world["worldRank"] = "S"
        result = check(world)
        self.assertEqual(result.errors, [])
        self.assertTrue(any("Bậc S" in w for w in result.warnings))


if __name__ == "__main__":
    unittest.main()
