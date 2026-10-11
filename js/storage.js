const STORAGE_KEY = 'universo-celulas-discovered';

export function loadDiscovered(validIds) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return new Set();
    const valid = new Set(validIds);
    return new Set(ids.filter((id) => valid.has(id)));
  } catch {
    return new Set();
  }
}

export function saveDiscovered(discovered) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered]));
  } catch {}
}
