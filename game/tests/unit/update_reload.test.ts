// The title's "update - tap to reload" always reloads (developer, 2026-10-27).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyUpdate } from '../../src/save/offline';

const container = () => {
  const handlers: (() => void)[] = [];
  return { addEventListener: (_t: string, f: () => void) => { handlers.push(f); }, fire: () => handlers.forEach((f) => f()) };
};
const worker = (state: ServiceWorkerState) => ({ state, postMessage: vi.fn() });

describe('update - tap to reload', () => {
  afterEach(() => vi.useRealTimers());

  it('asks the waiting worker to take over and reloads when it has, once', () => {
    vi.useFakeTimers();
    const sw = container(), w = worker('installed'), reload = vi.fn();
    applyUpdate({ waiting: w as never }, w as never, reload, sw as never);
    expect(w.postMessage).toHaveBeenCalledWith('skip-waiting');
    expect(reload).not.toHaveBeenCalled();
    sw.fire();
    vi.advanceTimersByTime(5000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads anyway when the new worker never takes over', () => {
    vi.useFakeTimers();
    const sw = container(), w = worker('installed'), reload = vi.fn();
    applyUpdate({ waiting: w as never }, w as never, reload, sw as never);
    vi.advanceTimersByTime(1400);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at once when the offered worker already took over (another tab) or was replaced', () => {
    for (const state of ['activated', 'redundant'] as const) {
      const sw = container(), reload = vi.fn();
      const offered = worker(state);
      applyUpdate({ waiting: null }, offered as never, reload, sw as never);
      expect(offered.postMessage).not.toHaveBeenCalled();
      expect(reload).toHaveBeenCalledTimes(1);
    }
  });

  it('a newer worker waiting instead of the offered one is the one asked', () => {
    vi.useFakeTimers();
    const sw = container(), old = worker('redundant'), newer = worker('installed'), reload = vi.fn();
    applyUpdate({ waiting: newer as never }, old as never, reload, sw as never);
    expect(newer.postMessage).toHaveBeenCalledWith('skip-waiting');
    expect(old.postMessage).not.toHaveBeenCalled();
  });
});
