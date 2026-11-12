import { AxiosHeaders } from 'axios';
import { isPlainObject } from 'es-toolkit/predicate';

interface ReplayConfig {
  data?: unknown;
  transformRequest?: unknown;
}

function isHtmlForm(value: unknown): value is HTMLFormElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object HTMLFormElement]'
  );
}

function isNativeFormData(value: object): value is FormData {
  return (
    Object.prototype.toString.call(value) === '[object FormData]' &&
    'forEach' in value &&
    typeof value.forEach === 'function'
  );
}

function snapshotValue(value: unknown, copies: WeakMap<object, object>): unknown {
  if (value === null || typeof value !== 'object') return value;

  const previous = copies.get(value);
  if (previous !== undefined) return previous;

  if (value instanceof AxiosHeaders) return new AxiosHeaders(value);
  if (value instanceof URLSearchParams) return new URLSearchParams(value);
  if (isNativeFormData(value)) {
    const form = new FormData();
    value.forEach((entry, name) => form.append(name, entry));
    return form;
  }
  if (value instanceof Date) return new Date(value.getTime());
  if (
    value instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer)
  ) {
    return value.slice(0);
  }
  if (ArrayBuffer.isView(value)) {
    // Axios can send the full backing buffer of a view, so preserve its offset and buffer.
    const length: unknown = Reflect.get(value, 'length');
    const copy: unknown = Reflect.construct(value.constructor, [
      value.buffer.slice(0),
      value.byteOffset,
      typeof length === 'number' ? length : value.byteLength,
    ]);
    return copy;
  }

  let copy: object;
  if (Array.isArray(value)) {
    copy = new Array<unknown>(value.length);
  } else if (isPlainObject(value)) {
    copy = Object.getPrototypeOf(value) === null ? (Object.create(null) as object) : {};
  } else {
    // Keep native objects such as Blob, AbortSignal and streams usable by the adapter.
    return value;
  }

  copies.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue;
    const entry: unknown = Reflect.get(value, key);
    Object.defineProperty(copy, key, {
      value: snapshotValue(entry, copies),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  return copy;
}

export function canSnapshotReplayConfig(config: ReplayConfig): boolean {
  return config.transformRequest === undefined || !isHtmlForm(config.data);
}

export function snapshotReplayConfig<C extends ReplayConfig>(config: C): C {
  const snapshot = snapshotValue(config, new WeakMap()) as C;
  if (!isHtmlForm(snapshot.data) || snapshot.transformRequest !== undefined) return snapshot;

  // Capture the same successful controls Axios reads in its default HTML form transformation.
  return { ...snapshot, data: new FormData(snapshot.data) };
}
