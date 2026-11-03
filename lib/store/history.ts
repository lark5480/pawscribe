import type { Species } from '../engine/types';
import type { TraceRecord } from '../engine/trace';

export const HISTORY_KEY = 'pawscribe-history-v1';
export const PENDING_RESULT_KEY = 'pawscribe-pending-result';
export const HISTORY_VERSION = 1;
export const MAX_RECORDS_PER_PET = 20;
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

// 旧版单档案 petId；读取时按 species 迁移为 cat-default / dog-default
export const LEGACY_PET_ID = 'default';

export function petIdForSpecies(species: Species): string {
  return species + '-' + LEGACY_PET_ID;
}

// 压力分按物种分开存，避免猫测后打开狗结果读到猫的压力分
export const STRESS_KEY_PREFIX = 'pawscribe-stress';

export function stressKey(species: Species): string {
  return STRESS_KEY_PREFIX + ':' + species;
}


export interface HistoryRead {
  records: TraceRecord[];
  available: boolean;
  degraded: boolean;
}

export interface HistoryWrite {
  ok: boolean;
  records: TraceRecord[];
  reason?: 'unavailable' | 'quota' | 'invalid';
}

export interface PendingResult {
  code: string;
  vector: TraceRecord['vector'];
  testedAt: string;
  species: 'cat' | 'dog';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// 解析失败或字段不合法的记录直接丢弃，避免单条坏数据拖垮整个历史
export function normalizeRecord(value: unknown): TraceRecord | null {
  if (!isObject(value)) return null;
  const { id, species, petId, petLabel, code, vector, testedAt } = value;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (species !== 'cat' && species !== 'dog') return null;
  if (typeof petId !== 'string' || petId.length === 0) return null;
  if (petLabel !== undefined && typeof petLabel !== 'string') return null;
  if (typeof code !== 'string' || code.length === 0) return null;
  if (!Array.isArray(vector) || vector.length !== 15) return null;
  if (!vector.every((v) => Number.isInteger(v) && v >= 0 && v <= 2)) return null;
  if (typeof testedAt !== 'string' || Number.isNaN(Date.parse(testedAt))) return null;
  const record: TraceRecord = {
    id,
    species: species as 'cat' | 'dog',
    petId,
    code,
    vector: vector as TraceRecord['vector'],
    testedAt,
  };
  if (typeof petLabel === 'string') record.petLabel = petLabel;
  return record;
}

export function normalizeRecords(values: unknown[]): TraceRecord[] {
  return values.map(normalizeRecord).filter((r): r is TraceRecord => r !== null);
}

// 旧数据里的 petId='default' 按物种命名空间化，不升存储 key
export function migrateRecordPetId(record: TraceRecord): TraceRecord {
  if (record.petId !== LEGACY_PET_ID) return record;
  return { ...record, petId: petIdForSpecies(record.species) };
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    const probe = '__pawscribe_storage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readHistory(storage: Storage | null = getStorage()): HistoryRead {
  if (!storage) return { records: [], available: false, degraded: false };

  let raw: string | null;
  try {
    raw = storage.getItem(HISTORY_KEY);
  } catch {
    return { records: [], available: false, degraded: false };
  }
  if (!raw) return { records: [], available: true, degraded: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.version !== HISTORY_VERSION || !Array.isArray(parsed.records)) {
      return { records: [], available: true, degraded: true };
    }
    const normalized = normalizeRecords(parsed.records);
    const migrated = normalized.map(migrateRecordPetId);
    const changed = migrated.some((r, i) => r.petId !== normalized[i].petId);
    // 迁移结果 best-effort 写回；写回失败不影响本次读取
    if (changed) writeRecords(storage, migrated);
    return { records: migrated, available: true, degraded: false };
  } catch {
    return { records: [], available: true, degraded: true };
  }
}

function writeRecords(storage: Storage | null, records: TraceRecord[]): HistoryWrite {
  if (!storage) return { ok: false, records, reason: 'unavailable' };
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify({ version: HISTORY_VERSION, records }));
    return { ok: true, records };
  } catch {
    return { ok: false, records, reason: 'quota' };
  }
}

// 24h 内同宠物同 code 合并为最新一条；按新→旧排序；每个物种 + 宠物组合最多 20 条
export function mergeRecord(records: TraceRecord[], record: TraceRecord): TraceRecord[] {
  const anchor = Date.parse(record.testedAt);
  const kept = records.filter((r) => {
    const samePet = r.species === record.species && r.petId === record.petId && r.code === record.code;
    if (!samePet) return true;
    return Math.abs(Date.parse(r.testedAt) - anchor) >= DEDUPE_WINDOW_MS;
  });

  const next = [...kept, record].sort((a, b) => Date.parse(b.testedAt) - Date.parse(a.testedAt));
  const counts = new Map<string, number>();
  const capped: TraceRecord[] = [];
  for (const r of next) {
    const capacityKey = r.species + ':' + r.petId;
    const count = counts.get(capacityKey) ?? 0;
    if (count >= MAX_RECORDS_PER_PET) continue;
    counts.set(capacityKey, count + 1);
    capped.push(r);
  }
  return capped;
}

export function appendHistory(record: TraceRecord, storage: Storage | null = getStorage()): HistoryWrite {
  const read = readHistory(storage);
  if (!storage) return { ok: false, records: read.records, reason: 'unavailable' };
  const normalized = normalizeRecord(record);
  if (!normalized) return { ok: false, records: read.records, reason: 'invalid' };
  return writeRecords(storage, mergeRecord(read.records, migrateRecordPetId(normalized)));
}

export function removeHistoryRecord(id: string, storage: Storage | null = getStorage()): HistoryWrite {
  const read = readHistory(storage);
  if (!storage) return { ok: false, records: read.records, reason: 'unavailable' };
  return writeRecords(storage, read.records.filter((r) => r.id !== id));
}

// 只清空指定物种，另一物种的记录原样保留
export function clearHistoryForSpecies(species: Species, storage: Storage | null = getStorage()): HistoryWrite {
  const read = readHistory(storage);
  if (!storage) return { ok: false, records: [], reason: 'unavailable' };
  return writeRecords(storage, read.records.filter((r) => r.species !== species));
}

// 首页轨迹入口按物种判断，避免只有另一物种记录时点进空页
export function historySpeciesPresent(records: TraceRecord[]): { cat: boolean; dog: boolean } {
  const presence = { cat: false, dog: false };
  for (const record of records) presence[record.species] = true;
  return presence;
}

export function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function setPendingResult(pending: PendingResult): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_RESULT_KEY, JSON.stringify(pending));
  } catch {
    // 会话存储不可用时不阻断结果页
  }
}

// 压力分读取：猫册在缺少新 key 时回退读取旧 key 并迁移；狗册不读旧 key
export function readStress(species: Species, storage: Storage | null = getSessionStorage()): number | null {
  if (!storage) return null;
  try {
    const current = storage.getItem(stressKey(species));
    if (current !== null) {
      const n = parseInt(current, 10);
      return Number.isFinite(n) ? n : null;
    }
    if (species === 'cat') {
      const legacy = storage.getItem(STRESS_KEY_PREFIX);
      if (legacy !== null) {
        const n = parseInt(legacy, 10);
        if (Number.isFinite(n)) {
          try {
            storage.setItem(stressKey('cat'), String(n));
            storage.removeItem(STRESS_KEY_PREFIX);
          } catch {}
          return n;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStress(species: Species, score: number, storage: Storage | null = getSessionStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(stressKey(species), String(score));
  } catch {
    // 会话存储不可用时不阻断结果页
  }
}

export function takePendingResult(): PendingResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_RESULT_KEY);
    window.sessionStorage.removeItem(PENDING_RESULT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return null;
    const { code, vector, testedAt, species } = parsed;
    if (typeof code !== 'string' || code.length === 0) return null;
    if (!Array.isArray(vector) || vector.length !== 15) return null;
    if (!vector.every((v) => Number.isInteger(v) && v >= 0 && v <= 2)) return null;
    if (typeof testedAt !== 'string' || Number.isNaN(Date.parse(testedAt))) return null;
    if (species !== 'cat' && species !== 'dog') return null;
    return {
      code,
      vector: vector as TraceRecord['vector'],
      testedAt,
      species: species as 'cat' | 'dog',
    };
  } catch {
    return null;
  }
}
