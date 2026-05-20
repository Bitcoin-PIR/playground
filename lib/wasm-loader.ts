'use client';

let initPromise: Promise<typeof import('@vendor/wasm')> | null = null;

export async function loadWasm(): Promise<typeof import('@vendor/wasm')> {
  if (typeof window === 'undefined') {
    throw new Error('loadWasm() must be called from the browser');
  }
  if (!initPromise) {
    initPromise = (async () => {
      const mod = await import('@vendor/wasm');
      if (typeof mod.default === 'function') {
        await mod.default();
      }
      return mod;
    })();
  }
  return initPromise;
}
