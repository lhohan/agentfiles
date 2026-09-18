// Adapter registry. One module per fetch source.

import * as codereviewbench from './codereviewbench.mjs';
import * as deepswe from './deepswe.mjs';
import * as swebench from './swebench.mjs';
import * as tbench from './tbench.mjs';

const ADAPTERS = new Map([codereviewbench, deepswe, swebench, tbench].map((adapter) => [adapter.id, adapter]));

export function getAdapter(id) {
  const adapter = ADAPTERS.get(id);
  if (!adapter) throw new Error(`Unknown adapter "${id}"`);
  return adapter;
}

export function adapterIds() {
  return [...ADAPTERS.keys()];
}
