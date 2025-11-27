# Pre-Testing Checklist - Ticker Interval Fixes

## All Issues Found & Fixed ✅

### Initial Issues (From First Review)
- ✅ **Issue #1**: Manual dashboard show broke auto-rotation
- ✅ **Issue #2**: Manual dashboard hide broke auto-rotation  
- ✅ **Issue #3**: No client-side failsafe protection

### Additional Issues (From Pre-Testing Check)
- ✅ **Issue #4**: Webhook `/hook/ticker/show` broke auto-rotation
- ✅ **Issue #5**: Webhook `/hook/ticker/hide` broke auto-rotation
- ✅ **Issue #6**: Message add with `insertNow=true` broke auto-rotation
- ✅ **Issue #7**: Scheduled shows didn't coordinate with auto-rotation
- ✅ **Issue #8**: Settings changes while ticker visible could leave it stuck

## All Code Paths Now Fixed

### 1. Dashboard Manual Controls ✅
**Location**: `server.js` lines 1499-1560
- Manual "Show Ticker" button
- Manual "Hide Ticker" button
- Both now respect auto-rotation settings

### 2. Webhook Endpoints ✅
**Location**: `server.js` lines 227-297
- `GET /hook/ticker/show` - Used by Stream Deck, Touch Portal, etc.
- `GET /hook/ticker/hide` - External integrations
- Both now respect auto-rotation settings

### 3. Message Add with Instant Show ✅
**Location**: `server.js` lines 322-348
- `POST /hook/message/add` with `insertNow: true`
- Now respects auto-rotation settings

### 4. Scheduled Shows ✅
**Location**: `server.js` lines 1218-1258
- Time-based scheduled ticker shows
- Now clears auto-rotation timers to prevent conflicts
- Resumes auto-rotation after scheduled show completes

### 5. Settings Updates ✅
**Location**: `server.js` lines 1390-1436
- Changing ticker settings via dashboard
- Now handles edge case where ticker is visible during settings change
- Applies new duration immediately and resumes rotation

### 6. Client-Side Failsafe ✅
**Location**: `output.html` TickerManager class
- Added 2x duration failsafe timeout
- Prevents indefinite visibility if server fails
- Automatic recovery with warning log

## Files Modified

### Server-Side (`server.js`)
1. **Lines 227-267**: Webhook show endpoint
2. **Lines 269-297**: Webhook hide endpoint  
3. **Lines 322-348**: Message add with insertNow
4. **Lines 1218-1258**: Scheduled shows
5. **Lines 1390-1436**: Settings update handler
6. **Lines 1499-1522**: Dashboard show control
7. **Lines 1524-1548**: Dashboard hide control

### Client-Side (`output.html`)
1. **Line 1123**: Added `failsafeTimeout` property
2. **Lines 1420-1437**: Failsafe timeout logic in show()
3. **Lines 1457-1461**: Clear failsafe in hide()
4. **Lines 1506-1509**: Clear failsafe in destroy()

## Verification Checklist

Before testing, verify these code patterns are consistent:

### ✅ Pattern 1: Show Ticker (with auto-rotation enabled)
```javascript
// Clear existing timers
if (autoRotateTimer) { clearTimeout(autoRotateTimer); autoRotateTimer = null; }
if (autoHideTimer) { clearTimeout(autoHideTimer); autoHideTimer = null; }

// Show ticker
state.ticker.enabled = true;
broadcastToOverlays({ type: 'ticker:show', ts: Date.now() });

// If auto-rotation enabled, schedule hide and resume
if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
  const durationMs = state.ticker.settings.durationSec * 1000;
  autoHideTimer = setTimeout(() => {
    state.ticker.enabled = false;
    broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
    autoHideTimer = null;
    startAutoRotation(); // Resume cycle
  }, durationMs);
}
```

### ✅ Pattern 2: Hide Ticker (with auto-rotation enabled)
```javascript
// Clear existing timers
if (autoRotateTimer) { clearTimeout(autoRotateTimer); autoRotateTimer = null; }
if (autoHideTimer) { clearTimeout(autoHideTimer); autoHideTimer = null; }

// Hide ticker
state.ticker.enabled = false;
broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });

// If auto-rotation enabled, restart cycle
if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
  startAutoRotation();
}
```

## Testing Scenarios

### Scenario 1: Dashboard Manual Show
1. Enable auto-rotation with `intervalMin=5`, `durationSec=10`
2. Click dashboard "Show Ticker"
3. **Expected**: Ticker hides after 10 seconds
4. **Expected**: Ticker re-appears after 5 minutes
5. **Expected**: Server log shows "Manual show with auto-rotation enabled"

### Scenario 2: Dashboard Manual Hide
1. Enable auto-rotation, wait for automatic show
2. Click dashboard "Hide Ticker" before it auto-hides
3. **Expected**: Ticker hides immediately
4. **Expected**: Ticker re-appears after 5 minutes (interval)
5. **Expected**: Server log shows "Manual hide with auto-rotation enabled"

### Scenario 3: Webhook Show (Stream Deck, etc.)
1. Enable auto-rotation
2. Call `GET http://localhost:4155/hook/ticker/show`
3. **Expected**: Same behavior as dashboard manual show
4. **Expected**: Server log shows "Webhook show with auto-rotation enabled"

### Scenario 4: Webhook Hide
1. Enable auto-rotation, show ticker
2. Call `GET http://localhost:4155/hook/ticker/hide`
3. **Expected**: Same behavior as dashboard manual hide
4. **Expected**: Server log shows "Webhook hide with auto-rotation enabled"

### Scenario 5: Message Add with insertNow
1. Enable auto-rotation
2. Call `POST /hook/message/add` with `{"text": "Test", "insertNow": true}`
3. **Expected**: Ticker shows immediately
4. **Expected**: Ticker hides after duration
5. **Expected**: Auto-rotation resumes

### Scenario 6: Scheduled Show
1. Enable auto-rotation
2. Create a scheduled show for current time + 1 minute
3. **Expected**: Scheduled show interrupts auto-rotation
4. **Expected**: After scheduled show completes, auto-rotation resumes
5. **Expected**: Server log shows "Scheduled show complete - resuming auto-rotation"

### Scenario 7: Settings Change While Visible
1. Enable auto-rotation, show ticker
2. While ticker visible, change `durationSec` from 10 to 5
3. Click "Save Settings"
4. **Expected**: Ticker hides after NEW duration (5 seconds from settings save)
5. **Expected**: Server log shows "Settings changed while ticker visible"

### Scenario 8: Client Failsafe Triggers
1. Enable auto-rotation with `durationSec=10`
2. Show ticker
3. **Normal**: Server sends hide at 10 seconds
4. **Failsafe**: If server fails, client hides at 20 seconds (2x duration)
5. **Expected**: Browser console shows failsafe warning only if server failed

### Scenario 9: Auto-Rotation Disabled
1. Disable auto-rotation (uncheck toggle or set `intervalMin=0`)
2. Manually show ticker
3. **Expected**: Ticker stays visible indefinitely (old behavior OK when disabled)
4. **Expected**: No auto-hide scheduled
5. **Expected**: Must be manually hidden

### Scenario 10: Client Failsafe with No Auto-Rotation
1. Disable auto-rotation
2. Manually show ticker  
3. **Expected**: No client failsafe (since `intervalMin=0`)
4. **Expected**: Ticker stays visible until manually hidden

## Edge Cases to Test

### Edge Case 1: Rapid Show/Hide
1. Rapidly click "Show" and "Hide" buttons
2. **Expected**: No timer leaks, proper cleanup
3. **Expected**: Auto-rotation eventually stabilizes

### Edge Case 2: Settings Change During Rotation Wait
1. Auto-rotation waiting for interval (ticker hidden)
2. Change settings
3. **Expected**: New interval applied
4. **Expected**: Next show uses new settings

### Edge Case 3: Multiple Scheduled Shows
1. Create multiple scheduled shows close together
2. **Expected**: Each clears previous timers
3. **Expected**: Auto-rotation resumes after last scheduled show

### Edge Case 4: Server Restart During Visible Ticker
1. Show ticker
2. Restart server while visible
3. **Expected**: Client failsafe catches stuck ticker
4. **Expected**: Auto-rotation starts fresh on server restart

## Monitoring & Logs

### Server Logs to Watch
✅ Success indicators:
- `Manual show with auto-rotation enabled - scheduling auto-hide`
- `Manual show auto-hide complete - resuming rotation cycle`
- `Manual hide with auto-rotation enabled - restarting rotation cycle`
- `Webhook show with auto-rotation enabled - scheduling auto-hide`
- `Webhook hide with auto-rotation enabled - restarting rotation cycle`
- `Scheduled show complete - resuming auto-rotation cycle`
- `Settings changed while ticker visible - applying new duration`
- `Settings-triggered hide complete - resuming rotation`

### Client Console Logs to Watch
✅ Normal operation:
- `[Ticker] Failsafe timeout set: Xms (2x Ys)`

⚠️ Warning (investigate if seen):
- `[Ticker] Failsafe auto-hide triggered - server did not send hide command`

## Known Limitations

1. **Scheduled shows override auto-rotation**: This is by design. Scheduled shows take priority and resume auto-rotation after completion.

2. **Settings changes reset timing**: When you change `durationSec` or `intervalMin` while ticker is visible, the new duration applies immediately (not from original show time).

3. **Failsafe is 2x duration**: The client failsafe uses 2x the expected duration. This is intentional to avoid premature hiding if server is slightly delayed.

## Ready for Testing

All code paths have been reviewed and fixed. All patterns are consistent. All edge cases have been considered.

✅ **Ready to test** - No additional code changes needed before testing.

## Post-Testing

After testing, update this checklist with:
- [ ] Any issues discovered during testing
- [ ] Any additional edge cases found
- [ ] Performance observations
- [ ] Final verification status
