// Optional local model-catalog data used only to describe operational tie-breaks.
// This reader opens the model store, never provider credentials or APIs.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

export const DEFAULT_MODEL_STORE = `${homedir()}/.pi/agent/models-store.json`;
const DEFAULT_SOURCE = '~/.pi/agent/models-store.json';

function sourceLabel(path) {
  const home = homedir();
  return path === DEFAULT_MODEL_STORE ? DEFAULT_SOURCE : path;
}

function field(value, source, readAt) {
  return {
    value: typeof value === 'number' ? value : 'not-in-store',
    source,
    read_at: readAt,
  };
}

function readAtFor(provider, fallback) {
  if (fallback) return fallback;
  const checkedAt = provider?.checkedAt;
  return Number.isFinite(checkedAt) ? new Date(checkedAt).toISOString() : new Date().toISOString();
}

/**
 * Read only the model metadata for the evaluated provider/model routes.
 * Missing files, providers, models, and fields remain explicit markers.
 */
export function loadOperationalData({ path = DEFAULT_MODEL_STORE, routes = [], readAt = null } = {}) {
  const source = sourceLabel(path);
  let store = {};
  if (existsSync(path)) {
    try {
      store = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      store = {};
    }
  }

  const routeData = {};
  for (const route of routes) {
    const separator = route.indexOf('/');
    const providerId = separator === -1 ? '' : route.slice(0, separator);
    const modelId = separator === -1 ? route : route.slice(separator + 1);
    const provider = store?.[providerId];
    const model = Array.isArray(provider?.models) ? provider.models.find((entry) => entry?.id === modelId) : undefined;
    const fieldReadAt = readAtFor(provider, readAt);
    routeData[route] = {
      input_price: field(model?.cost?.input, source, fieldReadAt),
      output_price: field(model?.cost?.output, source, fieldReadAt),
      context_limit: field(model?.contextWindow, source, fieldReadAt),
    };
  }

  return { source, read_at: readAt ?? new Date().toISOString(), routes: routeData };
}
