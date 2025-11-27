const { describe, it, expect, beforeEach } = require('vitest');

const {
  __testing: {
    DEFAULT_STATE,
    getDefaultAnalytics,
    ensureAnalyticsState,
    recordTickerShow,
    getAnalyticsPayload,
    syncMessageAnalytics,
    setState,
    getState
  }
} = require('../../server.js');

function resetState() {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
  fresh.analytics = getDefaultAnalytics();
  setState(fresh);
  return fresh;
}

describe('analytics helpers', () => {
  beforeEach(() => {
    resetState();
  });

  it('ensureAnalyticsState initializes missing analytics', () => {
    const state = getState();
    state.analytics = null;
    ensureAnalyticsState();
    expect(state.analytics).toEqual(getDefaultAnalytics());
  });

  it('recordTickerShow increments views only for enabled messages', () => {
    const state = getState();
    state.ticker.messages = [
      { id: '1', enabled: true },
      { id: '2', enabled: false },
      { id: '3', enabled: true }
    ];

    recordTickerShow(state.ticker.messages);

    expect(state.analytics.totalTickerShows).toBe(1);
    expect(state.analytics.totalTickerMessagesServed).toBe(2);
    expect(state.analytics.messageViews).toEqual({ 1: 1, 3: 1 });
  });

  it('syncMessageAnalytics removes stale message ids', () => {
    const state = getState();
    state.ticker.messages = [{ id: 'keep', enabled: true }];
    state.analytics.messageViews = { keep: 5, stale: 2 };

    syncMessageAnalytics();
    expect(state.analytics.messageViews).toEqual({ keep: 5 });
  });

  it('getAnalyticsPayload summarizes stats', () => {
    const state = getState();
    state.analytics = {
      totalTickerShows: 3,
      totalTickerMessagesServed: 9,
      messageViews: { a: 5 },
      popupShows: 4,
      popupDismissed: 1,
      lastUpdated: 123
    };
    state.popupQueue = [{ id: 'p1' }];

    const payload = getAnalyticsPayload();
    expect(payload).toMatchObject({
      totalShows: 3,
      totalViews: 9,
      popupStats: {
        shown: 4,
        dismissed: 1,
        queued: 1
      }
    });
  });
});
