// Experimental numbers only. No DUDU runtime imports or production identifiers.
export const ENVIRONMENT = 'MOCK_ONLY';
export const SCHEMA_VERSION = 1;
export const RULES_VERSION = 'slice-s-reference-1';
export const OWNER_ID = 'mock-reader-s';
export const CHARACTER = Object.freeze({ maxHp: 148, maxLl: 38, attack: 36, defense: 8, weapon: 'mock-fixed-sword', label: 'Nhân vật thử nghiệm' });
export const ENEMY = Object.freeze({ id: 'mock-stone-beast', maxHp: 110, attack: 30, defense: 10, label: 'Nham thú · mẫu thử', intents: Object.freeze(['prepare', 'heavy', 'basic']) });
export const SKILLS = Object.freeze({
  cleave: Object.freeze({ label: 'Liệt Phong Trảm', cost: 6, cooldown: 2 }),
  ward: Object.freeze({ label: 'Thạch Giáp Quyết', cost: 6, cooldown: 2 }),
  suppress: Object.freeze({ label: 'Hàn Tuyền Chú', cost: 6, cooldown: 2 })
});
export const ACTIONS = Object.freeze(['basic', 'guard', 'cleave', 'ward', 'suppress', 'potion', 'retreat']);
