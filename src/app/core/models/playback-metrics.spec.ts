import { describe, expect, it } from 'vitest';

import {
  INITIAL_ANALYTICS_STATE,
  reduceOnLoadComplete,
  reduceOnLoadStart,
  reduceOnQualitySwitch,
  reduceOnStateChange,
  type AnalyticsState,
} from './playback-metrics.model';

const afterFirstFrame = (state: AnalyticsState): AnalyticsState => ({
  ...state,
  hasReachedFirstFrame: true,
});

describe('reduceOnLoadStart / reduceOnLoadComplete', () => {
  it('records manifest load time as the delta between start and complete', () => {
    let state = reduceOnLoadStart(INITIAL_ANALYTICS_STATE, 1000);
    state = reduceOnLoadComplete(state, 1350);
    expect(state.metrics.manifestLoadTimeMs).toBe(350);
  });

  it('starts the startup-time clock at load completion, not load start', () => {
    let state = reduceOnLoadStart(INITIAL_ANALYTICS_STATE, 1000);
    state = reduceOnLoadComplete(state, 1350);
    expect(state.playbackRequestedAtMs).toBe(1350);
  });

  it('is a no-op if completion fires without a matching start', () => {
    const state = reduceOnLoadComplete(INITIAL_ANALYTICS_STATE, 500);
    expect(state).toEqual(INITIAL_ANALYTICS_STATE);
  });
});

describe('reduceOnStateChange — startup', () => {
  it('records startup time as the delta from playbackRequestedAt to the first "playing"', () => {
    let state = reduceOnLoadStart(INITIAL_ANALYTICS_STATE, 0);
    state = reduceOnLoadComplete(state, 200); // playbackRequestedAtMs = 200
    state = reduceOnStateChange(state, 'paused', 'buffering', 250);
    state = reduceOnStateChange(state, 'buffering', 'playing', 1620);
    expect(state.metrics.startupTimeMs).toBe(1420);
  });

  it('only records startup time once, on the first frame', () => {
    let state = reduceOnLoadComplete(reduceOnLoadStart(INITIAL_ANALYTICS_STATE, 0), 100);
    state = reduceOnStateChange(state, 'buffering', 'playing', 900); // first frame: 800ms
    state = reduceOnStateChange(state, 'playing', 'paused', 1000);
    state = reduceOnStateChange(state, 'paused', 'playing', 5000); // resume, not startup
    expect(state.metrics.startupTimeMs).toBe(800);
  });
});

describe('reduceOnStateChange — rebuffering', () => {
  it('does not count the initial wait for data as a rebuffer', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'idle', 'buffering', 100);
    expect(state.metrics.rebufferCount).toBe(0);
  });

  it('counts an interruption after first frame as a rebuffer, and times its duration', () => {
    let state = afterFirstFrame(INITIAL_ANALYTICS_STATE);
    state = reduceOnStateChange(state, 'playing', 'buffering', 5000);
    expect(state.metrics.rebufferCount).toBe(1);
    state = reduceOnStateChange(state, 'buffering', 'playing', 5750);
    expect(state.metrics.totalRebufferDurationMs).toBe(750);
  });

  it('accumulates duration across multiple rebuffers', () => {
    let state = afterFirstFrame(INITIAL_ANALYTICS_STATE);
    state = reduceOnStateChange(state, 'playing', 'buffering', 1000);
    state = reduceOnStateChange(state, 'buffering', 'playing', 1200); // +200
    state = reduceOnStateChange(state, 'playing', 'buffering', 3000);
    state = reduceOnStateChange(state, 'buffering', 'playing', 3500); // +500
    expect(state.metrics.rebufferCount).toBe(2);
    expect(state.metrics.totalRebufferDurationMs).toBe(700);
  });
});

describe('reduceOnStateChange — seek/pause/resume', () => {
  it('counts a seek', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'playing', 'seeking', 100);
    expect(state.metrics.seekCount).toBe(1);
  });

  it('counts pause only when transitioning from playing', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'playing', 'paused', 100);
    expect(state.metrics.pauseCount).toBe(1);
  });

  it('does not count a pause reached via buffering/seeking as a user pause', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'buffering', 'paused', 100);
    expect(state.metrics.pauseCount).toBe(0);
  });

  it('counts resume only when transitioning from paused', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'paused', 'playing', 100);
    expect(state.metrics.resumeCount).toBe(1);
  });

  it('does not count reaching "playing" from buffering as a resume', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'buffering', 'playing', 100);
    expect(state.metrics.resumeCount).toBe(0);
  });
});

describe('reduceOnStateChange — completion and errors', () => {
  it('marks the session completed on "ended"', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'playing', 'ended', 100);
    expect(state.metrics.completed).toBe(true);
  });

  it('counts an error', () => {
    const state = reduceOnStateChange(INITIAL_ANALYTICS_STATE, 'playing', 'error', 100);
    expect(state.metrics.errorCount).toBe(1);
  });
});

describe('reduceOnQualitySwitch', () => {
  it('increments the quality-switch counter', () => {
    let state = reduceOnQualitySwitch(INITIAL_ANALYTICS_STATE);
    state = reduceOnQualitySwitch(state);
    expect(state.metrics.qualitySwitches).toBe(2);
  });
});
