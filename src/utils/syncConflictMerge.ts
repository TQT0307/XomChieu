const ABSENT = Symbol('absent');

type MergeValue = unknown | typeof ABSENT;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value);

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length
      && left.every((item, index) => deepEqual(item, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length
      && leftKeys.every(key =>
        Object.prototype.hasOwnProperty.call(right, key)
        && deepEqual(left[key], right[key])
      );
  }
  return false;
};

const hasStableIds = (items: unknown[]): items is Array<Record<string, unknown> & { id: string | number }> =>
  items.length > 0
  && items.every(item =>
    isPlainObject(item)
    && (typeof item.id === 'string' || typeof item.id === 'number')
  );

const mergePresentValues = (base: unknown, local: unknown, remote: unknown): unknown => {
  if (deepEqual(local, remote)) return local;
  if (deepEqual(local, base)) return remote;
  if (deepEqual(remote, base)) return local;

  if (isPlainObject(local) && isPlainObject(remote)) {
    const baseObject = isPlainObject(base) ? base : {};
    const result: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(baseObject),
      ...Object.keys(local),
      ...Object.keys(remote)
    ]);

    keys.forEach(key => {
      const merged = mergeWithPresence(
        Object.prototype.hasOwnProperty.call(baseObject, key) ? baseObject[key] : ABSENT,
        Object.prototype.hasOwnProperty.call(local, key) ? local[key] : ABSENT,
        Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : ABSENT
      );
      if (merged !== ABSENT) result[key] = merged;
    });
    return result;
  }

  if (Array.isArray(local) && Array.isArray(remote)) {
    const baseArray = Array.isArray(base) ? base : [];
    const allItems = [...baseArray, ...local, ...remote];
    if (hasStableIds(allItems)) {
      return mergeCollections(baseArray, local, remote);
    }
  }

  // When both administrators changed the exact same scalar/atomic array,
  // prefer the explicit edit currently being saved.
  return local;
};

const mergeWithPresence = (
  base: MergeValue,
  local: MergeValue,
  remote: MergeValue
): MergeValue => {
  if (local === ABSENT && remote === ABSENT) return ABSENT;

  if (local === ABSENT) {
    if (base === ABSENT) return remote;
    // A local deletion is safe only when the remote record/field was not
    // changed concurrently. Otherwise preserve the newer remote value.
    return deepEqual(remote, base) ? ABSENT : remote;
  }

  if (remote === ABSENT) {
    if (base === ABSENT) return local;
    // Respect a remote deletion unless the current administrator also edited
    // the same record after loading the base version.
    return deepEqual(local, base) ? ABSENT : local;
  }

  return mergePresentValues(base === ABSENT ? undefined : base, local, remote);
};

const mergeCollections = (
  base: unknown[],
  local: unknown[],
  remote: unknown[]
): unknown[] => {
  const baseById = new Map(base.map(item => [(item as { id: string | number }).id, item]));
  const localById = new Map(local.map(item => [(item as { id: string | number }).id, item]));
  const remoteById = new Map(remote.map(item => [(item as { id: string | number }).id, item]));
  const orderedIds = [
    ...localById.keys(),
    ...[...remoteById.keys()].filter(id => !localById.has(id))
  ];

  const result: unknown[] = [];
  orderedIds.forEach(id => {
    const merged = mergeWithPresence(
      baseById.has(id) ? baseById.get(id) : ABSENT,
      localById.has(id) ? localById.get(id) : ABSENT,
      remoteById.has(id) ? remoteById.get(id) : ABSENT
    );
    if (merged !== ABSENT) result.push(merged);
  });
  return result;
};

/**
 * Three-way merge used only after the API reports an optimistic-concurrency
 * conflict. It preserves unrelated remote edits/additions while applying the
 * current administrator's explicit changes.
 */
export const mergeConcurrentKeyData = (
  base: unknown,
  local: unknown,
  remote: unknown
): unknown => mergePresentValues(base, local, remote);

