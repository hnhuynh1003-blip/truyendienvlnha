#!/usr/bin/env python3
"""Preflight semantic checks for Vạn Giới authoring drafts V0.1.

Usage: python3 validate_world.py world.json

Only Python standard library is required. If jsonschema is installed, the
optional complete JSON Schema pass also runs. This tool cannot prove story
quality, reachability under all conditions, actual image rights, runtime
compatibility or security of a deployed game engine.
"""

from __future__ import annotations

import json
import re
import sys
from collections import deque
from pathlib import Path

SCHEMA_VERSION = "world-authoring-0.1"
GENRES = {"ancient", "modern", "period", "future", "cultivation", "apocalypse"}
RANKS = {"F": (1, 1), "E": (1, 1), "D": (2, 2), "C": (2, 3),
         "B": (3, 4), "A": (4, 6), "S": (5, 8)}
RELEASE_STATES = {"approved", "staged", "published"}
REQUIRED_TOP = {"schemaVersion", "worldId", "contentVersion", "title", "genreId", "worldRank",
                "dangerLevel", "status", "author", "story", "worldCoverAssetId", "assets",
                "maps", "places", "scenes", "views", "cast", "npcs", "playerEntryProfiles", "entryPolicy", "items", "shops", "missions", "endings", "playRequirements", "entry", "aiPolicy"}
IDENT = re.compile(r"^[a-z][a-z0-9-]{1,63}$")


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)


def array(obj: dict, key: str, report: Report) -> list[dict]:
    value = obj.get(key, [])
    if not isinstance(value, list):
        report.err(f"'{key}' phải là danh sách")
        return []
    if any(not isinstance(v, dict) for v in value):
        report.err(f"'{key}' chỉ được chứa object")
        return [v for v in value if isinstance(v, dict)]
    return value


def registry(values: list[dict], id_key: str, name: str, report: Report) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for index, row in enumerate(values):
        identifier = row.get(id_key)
        if not isinstance(identifier, str) or not IDENT.fullmatch(identifier):
            report.err(f"{name}[{index}].{id_key}: ID không hợp lệ")
        elif identifier in result:
            report.err(f"{name}: trùng ID '{identifier}'")
        else:
            result[identifier] = row
    return result


def check_ref(identifier: str | None, allowed: dict, label: str, report: Report) -> None:
    if not isinstance(identifier, str) or identifier not in allowed:
        report.err(f"{label}: tham chiếu thiếu '{identifier}'")


def check(data: object) -> Report:
    report = Report()
    if not isinstance(data, dict):
        report.err("Gốc JSON phải là object")
        return report

    for missing in sorted(REQUIRED_TOP - data.keys()):
        report.err(f"Thiếu trường gốc '{missing}'")
    if data.get("schemaVersion") != SCHEMA_VERSION:
        report.err(f"schemaVersion phải là '{SCHEMA_VERSION}'")
    if not isinstance(data.get("worldId"), str) or not IDENT.fullmatch(data["worldId"]):
        report.err("worldId không hợp lệ")
    if not isinstance(data.get("contentVersion"), str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", data["contentVersion"]):
        report.err("contentVersion phải là dạng 0.1.0")
    if not isinstance(data.get("title"), str) or not data["title"].strip():
        report.err("title không được rỗng")
    if data.get("genreId") not in GENRES:
        report.err("genreId không thuộc sáu nhóm thể loại")
    rank = data.get("worldRank")
    if rank not in RANKS:
        report.err("worldRank phải thuộc F/E/D/C/B/A/S")
    status = data.get("status")
    if status not in {"draft", "submitted", "inReview", "approved", "staged", "published", "retired"}:
        report.err("Trạng thái workflow không hợp lệ")

    assets = registry(array(data, "assets", report), "assetId", "assets", report)
    maps = registry(array(data, "maps", report), "mapId", "maps", report)
    places = registry(array(data, "places", report), "placeId", "places", report)
    scenes = registry(array(data, "scenes", report), "sceneId", "scenes", report)
    views = registry(array(data, "views", report), "viewId", "views", report)
    cast = registry(array(data, "cast", report), "characterId", "cast", report)
    visuals = registry(array(data, "characterVisuals", report), "characterId", "characterVisuals", report)
    appearances = registry(array(data, "characterAppearances", report), "appearanceId", "characterAppearances", report)
    npcs = registry(array(data, "npcs", report), "npcId", "npcs", report)
    profiles = registry(array(data, "playerEntryProfiles", report), "entryId", "playerEntryProfiles", report)
    items = registry(array(data, "items", report), "itemId", "items", report)
    shops = registry(array(data, "shops", report), "shopId", "shops", report)
    missions = registry(array(data, "missions", report), "missionId", "missions", report)
    endings = registry(array(data, "endings", report), "endingId", "endings", report)
    events = registry(array(data, "events", report), "eventId", "events", report)

    cover_id = data.get("worldCoverAssetId")
    check_ref(cover_id, assets, "worldCoverAssetId", report)
    if cover_id in assets and assets[cover_id].get("kind") != "worldCover":
        report.err("Ảnh bìa phải có kind=worldCover")
    if not any(a.get("kind") == "sceneBackground" for a in assets.values()):
        report.err("Thiếu ít nhất một sceneBackground")

    if not maps or not scenes or not places or not views or not endings:
        report.err("Cần ít nhất một map, place, scene, view và ending")
    for map_id, map_data in maps.items():
        place_ids = map_data.get("placeIds", [])
        if not isinstance(place_ids, list) or not place_ids:
            report.err(f"Map {map_id} thiếu placeIds")
        else:
            for place_id in place_ids:
                check_ref(place_id, places, f"Map {map_id}.placeIds", report)
                if place_id in places and places[place_id].get("mapId") != map_id:
                    report.err(f"Map {map_id} trỏ place thuộc map khác: '{place_id}'")
        if map_data.get("overviewAssetId"):
            check_ref(map_data["overviewAssetId"], assets, f"Map {map_id}.overviewAssetId", report)
    for place_id, place in places.items():
        check_ref(place.get("mapId"), maps, f"place {place_id}.mapId", report)
        if place.get("parentPlaceId") is not None:
            check_ref(place.get("parentPlaceId"), places, f"place {place_id}.parentPlaceId", report)
            if place.get("parentPlaceId") == place_id:
                report.err(f"place {place_id} không thể là parent của chính nó")
        ids = place.get("sceneIds", [])
        if not isinstance(ids, list) or not ids:
            report.err(f"place '{place_id}' thiếu sceneIds")
            continue
        for scene_id in ids:
            check_ref(scene_id, scenes, f"place {place_id}", report)
            if scene_id in scenes and scenes[scene_id].get("placeId") != place_id:
                report.err(f"place {place_id} trỏ scene {scene_id} thuộc place khác")

    graph: dict[str, set[str]] = {scene_id: set() for scene_id in scenes}
    for scene_id, scene in scenes.items():
        check_ref(scene.get("placeId"), places, f"scene {scene_id}.placeId", report)
        asset_id = scene.get("backgroundAssetId")
        check_ref(asset_id, assets, f"scene {scene_id}.backgroundAssetId", report)
        if asset_id in assets and assets[asset_id].get("kind") not in {"sceneBackground", "sceneVariant"}:
            report.err(f"scene {scene_id}: asset không phải ảnh cảnh")
        for view_id in scene.get("viewIds", []):
            check_ref(view_id, views, f"scene {scene_id}.viewIds", report)
            if view_id in views and views[view_id].get("sceneId") != scene_id:
                report.err(f"scene {scene_id} chứa view thuộc scene khác: '{view_id}'")
        for transition in scene.get("transitions", []):
            target = transition.get("toSceneId") if isinstance(transition, dict) else None
            check_ref(target, scenes, f"transition từ {scene_id}", report)
            if target in scenes:
                graph[scene_id].add(target)

    hotspots: dict[str, dict] = {}
    hotspot_parent_view: dict[str, str] = {}
    hotspot_pickup_keys: set[str] = set()
    for view_id, view in views.items():
        scene_id = view.get("sceneId")
        check_ref(scene_id, scenes, f"view {view_id}.sceneId", report)
        if view.get("assetId") is not None:
            check_ref(view.get("assetId"), assets, f"view {view_id}.assetId", report)
        if view.get("kind") not in {"wide", "detail", "interior", "illustration", "text_only"}:
            report.err(f"view {view_id}: kind không hợp lệ")
        for character_id in view.get("depictedCharacterIds", []):
            check_ref(character_id, cast, f"view {view_id}.depictedCharacterIds", report)
        for hotspot in view.get("hotspots", []):
            if not isinstance(hotspot, dict):
                report.err(f"view {view_id}: hotspot không phải object")
                continue
            hid = hotspot.get("hotspotId")
            if not isinstance(hid, str) or not IDENT.fullmatch(hid):
                report.err(f"view {view_id}: hotspotId không hợp lệ")
                continue
            if hid in hotspots:
                report.err(f"Trùng hotspotId '{hid}'")
            hotspots[hid] = hotspot
            hotspot_parent_view[hid] = view_id
            action = hotspot.get("action")
            target = hotspot.get("targetId")
            if action in {"pickup", "inspect"}:
                check_ref(target, items, f"hotspot {hid}.targetId", report)
            elif action == "talk":
                check_ref(target, npcs, f"hotspot {hid}.targetId", report)
            elif action == "shop":
                check_ref(target, shops, f"hotspot {hid}.targetId", report)
            elif action == "move":
                check_ref(target, scenes, f"hotspot {hid}.targetId", report)
            elif action == "focus":
                check_ref(target, views, f"hotspot {hid}.targetId", report)
                if target in views and views[target].get("sceneId") != scene_id:
                    report.err(f"hotspot {hid}: focus sang scene khác phải dùng move")
            elif action == "read":
                pass
            else:
                report.err(f"hotspot {hid}: action không hợp lệ")
            if action == "pickup" and not hotspot.get("uniquePickupId"):
                report.err(f"hotspot {hid}: pickup thiếu uniquePickupId")
            if action == "pickup" and hotspot.get("uniquePickupId"):
                key = hotspot["uniquePickupId"]
                if key in hotspot_pickup_keys:
                    report.err(f"Trùng uniquePickupId trong hotspot '{key}'")
                hotspot_pickup_keys.add(key)

    dialogue_ids: set[str] = set()
    for npc_id, npc in npcs.items():
        check_ref(npc.get("introSceneId"), scenes, f"NPC {npc_id}.introSceneId", report)
        if npc.get("characterId") is not None:
            check_ref(npc.get("characterId"), cast, f"NPC {npc_id}.characterId", report)
        if npc.get("mode") not in {"scripted", "ai_candidate"}:
            report.err(f"NPC {npc_id}: mode không hợp lệ/không được tự bật ai_active")
        levels = npc.get("interactionLevels", [])
        if not isinstance(levels, list) or not levels or not set(levels).issubset({"ambient", "scripted", "stateful", "service", "ai_candidate"}):
            report.err(f"NPC {npc_id}: interactionLevels không hợp lệ")
        dialogue_policy = npc.get("dialoguePolicy")
        if dialogue_policy not in {"no_dialogue", "barks", "choice_tree", "stateful_tree", "service", "ai_limited"}:
            report.err(f"NPC {npc_id}: dialoguePolicy không hợp lệ")
        if npc.get("mode") == "ai_candidate" and "ai_candidate" not in levels:
            report.err(f"NPC {npc_id}: mode ai_candidate thiếu interactionLevels tương ứng")
        if npc.get("friendable") and not npc.get("contactEligibilityFlag"):
            report.warn(f"NPC {npc_id}: có thể kết bạn nhưng thiếu contactEligibilityFlag")
        nodes = npc.get("dialogueNodes", [])
        local_nodes = {node.get("nodeId") for node in nodes if isinstance(node, dict)}
        if not local_nodes and dialogue_policy in {"choice_tree", "stateful_tree", "service", "ai_limited"}:
            report.warn(f"NPC {npc_id} chưa có thoại scripted/fallback cần thiết")
        for node in nodes:
            if not isinstance(node, dict):
                report.err(f"NPC {npc_id} có dialogueNode không hợp lệ")
                continue
            if node.get("nodeId") in dialogue_ids:
                report.err(f"Trùng dialogueNode ID '{node.get('nodeId')}'")
            dialogue_ids.add(node.get("nodeId"))
            for choice in node.get("choices", []):
                dest = choice.get("nextNodeId") if isinstance(choice, dict) else None
                if dest is not None and dest not in local_nodes:
                    report.err(f"NPC {npc_id} có lựa chọn trỏ đến node thiếu '{dest}'")

    # Character art belongs to cast and a narrative moment, not necessarily an NPC.
    variant_owner: dict[str, str] = {}
    variant_asset_kinds = {
        "portrait": {"characterPortrait", "npcPortrait"},
        "sprite": {"characterSprite"},
        "illustration": {"characterIllustration"},
        "silhouette": {"characterSilhouette"},
        "avatar": {"characterAvatar"},
    }
    variant_formats: dict[str, str] = {}
    for character_id, visual in visuals.items():
        check_ref(character_id, cast, f"characterVisuals {character_id}", report)
        priority = visual.get("visualPriority")
        if priority not in {"signature", "supporting", "cameo", "ambient", "offscreen"}:
            report.err(f"characterVisuals {character_id}: visualPriority không hợp lệ")
        if priority in {"signature", "supporting"} and not visual.get("fixedTraits"):
            report.warn(f"characterVisuals {character_id}: cần mô tả đặc điểm ngoại hình cố định, nhất là tuổi/nghề")
        if priority == "offscreen" and visual.get("variants"):
            report.warn(f"characterVisuals {character_id}: offscreen có ảnh; kiểm tra tránh lộ spoiler")
        for variant in visual.get("variants", []):
            if not isinstance(variant, dict):
                report.err(f"characterVisuals {character_id}: variant không phải object")
                continue
            variant_id = variant.get("variantId")
            if not isinstance(variant_id, str) or not IDENT.fullmatch(variant_id):
                report.err(f"characterVisuals {character_id}: variantId không hợp lệ")
                continue
            if variant_id in variant_owner:
                report.err(f"Trùng variantId '{variant_id}' giữa nhân vật")
            variant_owner[variant_id] = character_id
            variant_formats[variant_id] = variant.get("format")
            asset_id = variant.get("assetId")
            check_ref(asset_id, assets, f"variant {variant_id}.assetId", report)
            fmt = variant.get("format")
            if fmt not in variant_asset_kinds:
                report.err(f"variant {variant_id}: format không hợp lệ")
            elif asset_id in assets and assets[asset_id].get("kind") not in variant_asset_kinds[fmt]:
                report.err(f"variant {variant_id}: kind ảnh không khớp format {fmt}")

    possessed_cast = {p.get("castTargetId") for p in profiles.values() if p.get("mode") == "cast_possession"}
    for appearance_id, appearance in appearances.items():
        character_id = appearance.get("characterId")
        variant_id = appearance.get("variantId")
        check_ref(character_id, cast, f"appearance {appearance_id}.characterId", report)
        check_ref(appearance.get("viewId"), views, f"appearance {appearance_id}.viewId", report)
        if variant_id not in variant_owner:
            report.err(f"appearance {appearance_id}: variantId thiếu '{variant_id}'")
        elif variant_owner[variant_id] != character_id:
            report.err(f"appearance {appearance_id}: variantId '{variant_id}' thuộc nhân vật khác")
        display = appearance.get("displayMode")
        if display not in {"portrait", "sprite", "illustration", "silhouette"}:
            report.err(f"appearance {appearance_id}: displayMode không hợp lệ")
        elif variant_id in variant_formats and display != variant_formats[variant_id]:
            report.err(f"appearance {appearance_id}: displayMode không khớp format biến thể")
        show_on = appearance.get("showOn")
        hide_on = appearance.get("hideOn")
        if show_on not in {"scene_enter", "dialogue_start", "event_flag"}:
            report.err(f"appearance {appearance_id}: showOn không hợp lệ")
        if hide_on not in {"dialogue_end", "view_exit", "flag_change", "event_end"}:
            report.err(f"appearance {appearance_id}: hideOn không hợp lệ")
        trigger = appearance.get("triggerRef")
        if show_on == "dialogue_start":
            check_ref(trigger, {did: True for did in dialogue_ids}, f"appearance {appearance_id}.triggerRef thoại", report)
        elif show_on == "event_flag" and not isinstance(trigger, str):
            report.err(f"appearance {appearance_id}: event_flag cần triggerRef là cờ sự kiện")
        if show_on == "scene_enter" and hide_on == "dialogue_end":
            report.warn(f"appearance {appearance_id}: scene_enter nhưng ẩn sau dialogue_end có thể giữ ảnh quá lâu")
        if character_id in possessed_cast and display == "sprite" and appearance.get("suppressWhenPossessed") is False:
            report.err(f"appearance {appearance_id}: sprite của vai đang bị nhập phải ẩn khi cast_possession để không nhân đôi")
        overlap = set(appearance.get("requiredFlags", [])) & set(appearance.get("forbiddenFlags", []))
        if overlap:
            report.err(f"appearance {appearance_id}: điều kiện vừa bắt buộc vừa cấm cờ {sorted(overlap)}")
        position = appearance.get("position")
        if position is not None and not isinstance(position, dict):
            report.err(f"appearance {appearance_id}: position phải là object")
        elif position is not None:
            for coord in ("x", "y"):
                val = position.get(coord)
                if not isinstance(val, (float, int)) or isinstance(val, bool) or not 0 <= val <= 1:
                    report.err(f"appearance {appearance_id}: position.{coord} phải trong 0..1")
            scale = position.get("scale")
            if not isinstance(scale, (float, int)) or isinstance(scale, bool) or not 0 < scale <= 3:
                report.err(f"appearance {appearance_id}: position.scale phải trong (0,3]")

    if not profiles:
        report.err("Phải có ít nhất một playerEntryProfile được world hỗ trợ")
    for entry_id, profile in profiles.items():
        mode = profile.get("mode")
        check_ref(profile.get("startSceneId"), scenes, f"Entry {entry_id}.startSceneId", report)
        if mode == "cast_possession":
            cast_target = profile.get("castTargetId")
            check_ref(cast_target, cast, f"Entry {entry_id}.castTargetId", report)
            if cast_target in cast and not cast[cast_target].get("playableAsCast"):
                report.err(f"Entry {entry_id}: castTargetId chưa được đánh dấu playableAsCast")
            for actor_id, actor in npcs.items():
                if actor.get("characterId") == cast_target:
                    report.warn(f"Entry {entry_id}: actor '{actor_id}' phải được rebind/deactivate khi player nhập vai để không nhân đôi")
        elif mode == "system_cover":
            if not profile.get("coverName") or profile.get("identityAssurance") not in {"verified", "forged", "unknown"}:
                report.err(f"Entry {entry_id}: thân phận ảo thiếu coverName hoặc identityAssurance")
        elif mode == "native_extra":
            if not profile.get("nativeSlotId") or not profile.get("socialAnchorNotes"):
                report.err(f"Entry {entry_id}: nhân vật giáp phải có nativeSlotId và socialAnchorNotes")
        else:
            report.err(f"Entry {entry_id}: mode không thuộc ba kiểu nhập vai")

    entry_policy = data.get("entryPolicy", {})
    if not isinstance(entry_policy, dict) or entry_policy.get("mode") not in {"fixed", "player_choice"}:
        report.err("entryPolicy.mode phải là fixed hoặc player_choice")
    elif entry_policy["mode"] == "fixed":
        check_ref(entry_policy.get("forcedEntryId"), profiles, "entryPolicy.forcedEntryId", report)

    pickup_ids: set[str] = set()
    acquisition_count = 0
    for item_id, item in items.items():
        if item.get("transferPolicy") not in {"world_only", "extractable", "review_required"}:
            report.err(f"Item {item_id}: transferPolicy sai")
        for method in item.get("acquisitionMethods", []):
            if not isinstance(method, dict):
                report.err(f"Item {item_id}: acquisitionMethods có mục không hợp lệ")
                continue
            kind = method.get("type")
            if kind in {"pickup", "shop", "npcGift", "craft"}:
                acquisition_count += 1
            if kind == "pickup":
                check_ref(method.get("placeId"), places, f"Item {item_id} pickup", report)
                if method.get("viewId"):
                    check_ref(method.get("viewId"), views, f"Item {item_id} pickup view", report)
                if method.get("hotspotId"):
                    hid = method["hotspotId"]
                    check_ref(hid, hotspots, f"Item {item_id} pickup hotspot", report)
                    if hid in hotspots:
                        if hotspots[hid].get("action") != "pickup" or hotspots[hid].get("targetId") != item_id:
                            report.err(f"Item {item_id}: hotspot {hid} không trỏ đúng item pickup")
                        if hotspots[hid].get("uniquePickupId") != method.get("uniquePickupId"):
                            report.err(f"Item {item_id}: uniquePickupId khác giữa item và hotspot")
                        if method.get("viewId") and hotspot_parent_view[hid] != method["viewId"]:
                            report.err(f"Item {item_id}: hotspot {hid} không thuộc view đã khai")
                pickup_id = method.get("uniquePickupId")
                if not pickup_id:
                    report.err(f"Item {item_id} pickup thiếu uniquePickupId")
                elif pickup_id in pickup_ids:
                    report.err(f"Trùng pickup ID '{pickup_id}'")
                pickup_ids.add(pickup_id)
            if kind == "shop":
                check_ref(method.get("shopId"), shops, f"Item {item_id} shop", report)
            if kind == "questReward":
                check_ref(method.get("missionId"), missions, f"Item {item_id} reward", report)
    if not acquisition_count:
        report.warn("Chưa có nguồn nhặt/mua/đổi/chế tạo; tác giả cần giải thích ngoại lệ")

    for shop_id, shop in shops.items():
        check_ref(shop.get("placeId"), places, f"Shop {shop_id}.placeId", report)
        if shop.get("merchantNpcId"):
            check_ref(shop.get("merchantNpcId"), npcs, f"Shop {shop_id}.merchantNpcId", report)
        check_ref(shop.get("currencyItemId"), items, f"Shop {shop_id}.currencyItemId", report)
        for entry in shop.get("stock", []):
            check_ref(entry.get("itemId"), items, f"Shop {shop_id}.stock", report)
            if not isinstance(entry.get("price"), int) or entry["price"] < 0:
                report.err(f"Shop {shop_id}: giá không hợp lệ")
            if not isinstance(entry.get("quantity"), int) or entry["quantity"] < 0:
                report.err(f"Shop {shop_id}: tồn không hợp lệ")

    main_required = 0
    for mission_id, mission in missions.items():
        check_ref(mission.get("startSceneId"), scenes, f"Mission {mission_id}.startSceneId", report)
        kind = mission.get("kind")
        is_required = mission.get("requiredForCompletion")
        if kind == "main" and is_required is True:
            main_required += 1
        if kind in {"side", "hidden"} and is_required:
            report.err(f"Mission {mission_id}: side/hidden không được là requiredForCompletion")
        if not mission.get("objectives"):
            report.err(f"Mission {mission_id}: thiếu objectives")
        for objective in mission.get("objectives", []):
            verb = objective.get("verb")
            target = objective.get("targetId")
            target_registry = ({"talk": npcs, "collect": items, "inspect": items, "purchase": items,
                                "reach": scenes, "deliver": items}).get(verb)
            if target_registry is not None:
                check_ref(target, target_registry, f"Mission {mission_id} objective {verb}", report)
        reward = mission.get("rewardRequest", {})
        if not isinstance(reward.get("exp"), int) or reward.get("exp", -1) < 0:
            report.err(f"Mission {mission_id}: EXP đề nghị không hợp lệ")
        for item_grant in reward.get("items", []):
            check_ref(item_grant.get("itemId"), items, f"Mission {mission_id}.rewardRequest", report)
    if not main_required:
        report.err("Phải có ít nhất một main mission requiredForCompletion")

    for ending_id, ending in endings.items():
        if ending.get("result") not in {"success", "partial", "failure"}:
            report.err(f"Ending {ending_id}: kết quả không hợp lệ")

    play = data.get("playRequirements", {})
    if not isinstance(play, dict):
        report.err("playRequirements phải là object")
        play = {}
    must_visit = play.get("requiredVisitPlaceIds", [])
    must_talk = play.get("requiredInteractNpcIds", [])
    for key, ids, allowed in (("requiredVisitPlaceIds", must_visit, places),
                              ("requiredInteractNpcIds", must_talk, npcs)):
        if not isinstance(ids, list):
            report.err(f"playRequirements.{key} phải là danh sách")
            continue
        if not all(isinstance(value, str) for value in ids):
            report.err(f"playRequirements.{key} phải chỉ chứa ID dạng chữ")
        elif len(ids) != len(set(ids)):
            report.err(f"playRequirements.{key} có ID lặp")
        for value in ids:
            check_ref(value, allowed, f"playRequirements.{key}", report)

    entry = data.get("entry", {})
    if not isinstance(entry, dict):
        report.err("entry phải là object")
        entry = {}
    start = entry.get("entrySceneId")
    check_ref(start, scenes, "entry.entrySceneId", report)
    if entry.get("trialInstance") and entry.get("passportRequired"):
        report.warn("Trial trước hộ chiếu nhưng lại passportRequired; kiểm tra luồng tân thủ")
    if start in scenes:
        visited = {start}
        q = deque([start])
        while q:
            here = q.popleft()
            for next_scene in graph[here]:
                if next_scene not in visited:
                    visited.add(next_scene)
                    q.append(next_scene)
        for unreachable in sorted(set(scenes) - visited):
            report.warn(f"Scene '{unreachable}' không có đường chuyển cảnh từ điểm bắt đầu (kiểm tra event teleport nếu có)")

    policy = data.get("aiPolicy", {})
    if not isinstance(policy, dict) or policy.get("allowAiRewards") is not False or policy.get("allowAiWorldMutation") is not False:
        report.err("AI không được quyền cấp thưởng hoặc tự thay world state")
    ai_candidates = sum(npc.get("mode") == "ai_candidate" for npc in npcs.values())
    if ai_candidates and isinstance(policy, dict) and not policy.get("aiNpcRequested"):
        report.warn("Có ai_candidate nhưng aiNpcRequested=false")

    if rank in RANKS:
        req_missions, suggested_ai_budget = RANKS[rank]
        checks = [("main bắt buộc", main_required, req_missions)]
        for label, value, minimum in checks:
            if value < minimum:
                report.warn(f"Bậc {rank}: {label} {value} < mức đề xuất {minimum}; cần biên tập duyệt ngoại lệ")
        if ai_candidates > suggested_ai_budget:
            report.warn(f"Bậc {rank}: {ai_candidates} NPC AI candidate vượt ngân sách đề xuất {suggested_ai_budget}")

    author = data.get("author", {})
    if status in RELEASE_STATES:
        if not isinstance(author, dict) or author.get("ownershipDeclaration") is not True:
            report.err("Không thể xét release khi tác giả chưa xác nhận quyền nội dung")
        for asset_id, asset in assets.items():
            if asset.get("assetStatus") != "approved" or asset.get("license") == "unknown":
                report.err(f"Asset {asset_id} chưa được duyệt/không rõ license")
            if asset.get("license") == "licensed" and not asset.get("proofRef"):
                report.err(f"Asset {asset_id} có license mà thiếu proofRef")
    if "[TODO]" in json.dumps(data, ensure_ascii=False):
        if status in RELEASE_STATES or status == "submitted":
            report.err("Còn [TODO] trong bản gửi duyệt/phát hành")
        else:
            report.warn("Draft còn [TODO]: hãy hoàn thiện trước submit")

    return report


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python3 validate_world.py path/to/world.json")
        return 2
    path = Path(argv[1])
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: Không đọc được JSON: {exc}")
        return 2

    report = check(data)
    schema_path = Path(__file__).with_name("world.schema.json")
    try:
        import jsonschema  # type: ignore
    except ImportError:
        print("NOTE: Chưa cài jsonschema, bỏ qua bước JSON Schema chuẩn; semantic preflight vẫn chạy.")
    else:
        try:
            schema = json.loads(schema_path.read_text(encoding="utf-8"))
            jsonschema.Draft202012Validator.check_schema(schema)
            for violation in jsonschema.Draft202012Validator(schema).iter_errors(data):
                report.err(f"JSON Schema: {'.'.join(map(str, violation.path))}: {violation.message}")
        except (OSError, ValueError, jsonschema.exceptions.SchemaError) as exc:
            report.err(f"Schema nội bộ lỗi: {exc}")

    for msg in report.errors:
        print(f"ERROR: {msg}")
    for msg in report.warnings:
        print(f"WARN: {msg}")
    print(f"Kết quả: {len(report.errors)} lỗi; {len(report.warnings)} cảnh báo. ")
    print("Lưu ý: preflight không chứng minh world đã đạt QA nội dung hoặc đủ quyền publish.")
    return 1 if report.errors else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
