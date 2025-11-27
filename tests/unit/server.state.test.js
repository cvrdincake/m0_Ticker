const { describe, it, expect, beforeEach } = require('vitest');

const {
  __testing: {
    DEFAULT_STATE,
    ensureFallbackState,
    ensureTemplateState,
    ensureBulkConfigState,
    reindexMessages,
    buildTickerMessage,
    appendTickerMessage,
    executeBulkAction,
    addChangeHistory,
    addToHistory,
    setState,
    getState
  }
} = require('../../server.js');

function resetState() {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
  setState(fresh);
  return fresh;
}

describe('server state helpers', () => {
  beforeEach(() => {
    resetState();
  });

  it('ensureTemplateState initializes missing templates object', () => {
    const state = getState();
    state.templates = undefined;
    ensureTemplateState();
    expect(state.templates).toBeDefined();
    expect(state.templates).toEqual({});
  });

  it('ensureBulkConfigState initializes list when missing', () => {
    const state = getState();
    state.bulkConfigs = null;
    ensureBulkConfigState();
    expect(state.bulkConfigs).toEqual([]);
  });

  it('appendTickerMessage keeps sort order and supports insertNow', () => {
    const state = getState();
    ensureFallbackState();

    const first = buildTickerMessage({ text: 'A' });
    appendTickerMessage(first);
    const second = buildTickerMessage({ text: 'B' });
    appendTickerMessage(second);
    const urgent = buildTickerMessage({ text: 'C' });
    appendTickerMessage(urgent, true);

    expect(state.ticker.messages.map(m => m.text)).toEqual(['C', 'A', 'B']);
    expect(state.ticker.messages.map(m => m.sortIndex)).toEqual([0, 1, 2]);
  });

  it('reindexMessages recalculates sortIndex', () => {
    const state = getState();
    ensureFallbackState();

    state.ticker.messages = [
      buildTickerMessage({ text: 'One' }),
      buildTickerMessage({ text: 'Two' })
    ];
    state.ticker.messages[0].sortIndex = 10;
    state.ticker.messages[1].sortIndex = 11;

    reindexMessages();
    expect(state.ticker.messages.map(m => m.sortIndex)).toEqual([0, 1]);
  });

  it('executeBulkAction enables filtered messages', () => {
    const state = getState();
    ensureFallbackState();
    state.ticker.messages = [
      { id: '1', category: 'general', enabled: false },
      { id: '2', category: 'breaking', enabled: false }
    ];

    const result = executeBulkAction('enableAll', { filter: 'general' });
    expect(result.changed).toBe(true);
    expect(state.ticker.messages[0].enabled).toBe(true);
    expect(state.ticker.messages[1].enabled).toBe(false);
  });

  it('addChangeHistory maintains ring buffer of 50 entries', () => {
    const state = getState();
    state.metadata.changeHistory = [];

    for (let i = 0; i < 55; i++) {
      addChangeHistory(`Change ${i}`);
    }

    expect(state.metadata.changeHistory).toHaveLength(50);
    expect(state.metadata.changeHistory[0].description).toBe('Change 5');
  });

  it('addToHistory pushes snapshots up to 20 entries', () => {
    const state = getState();
    state.history = [];

    for (let i = 0; i < 25; i++) {
      addToHistory(`action-${i}`, { value: i });
    }

    expect(state.history).toHaveLength(20);
    expect(state.history[0].action).toBe('action-5');
  });
});
