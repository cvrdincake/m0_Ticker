# Ticker Interval Timing Fixes

## Issues Identified (Pre-Testing Review)

### 1. Manual Show Breaks Auto-Rotation
**Severity**: Critical  
**Location**: `server.js` dashboard control handler (lines 1409-1426)

**Problem**: When the ticker was manually shown via the dashboard's "Show Ticker" button, the auto-rotation timers were cleared but never restarted. This caused the ticker to remain visible indefinitely, ignoring the `durationSec` and `intervalMin` settings.

**Symptoms**:
- Clicking "Show Ticker" would display the ticker
- Ticker would stay visible forever unless manually hidden
- Auto-rotation would be completely disabled until server restart

### 2. Manual Hide Breaks Auto-Rotation
**Severity**: Critical  
**Location**: `server.js` lines 1429-1446

**Problem**: Similar to manual show, manually hiding the ticker cleared the timers but didn't restart the auto-rotation cycle. This meant auto-rotation would stop functioning until server restart.

**Symptoms**:
- After manually hiding, auto-rotation would never resume
- No scheduled ticker appearances would occur
- Rotation interval setting would be ignored

### 3. No Client-Side Failsafe
**Severity**: High  
**Location**: `output.html` TickerManager class

**Problem**: The client relied entirely on the server to send hide commands. If the server failed to send a hide command (due to timer issues, crashes, or bugs), the ticker would remain visible indefinitely with no client-side protection.

**Symptoms**:
- In rare cases where server timers failed, ticker would stay visible
- No automatic recovery mechanism
- Required manual intervention to hide stuck ticker

## Fixes Implemented

### Fix #1: Manual Show Respects Auto-Rotation
**File**: `server.js` lines 1427-1444

**Changes**:
- Added conditional logic to check if `autoRotate` is enabled and `intervalMin > 0`
- If auto-rotation is active, schedules `autoHideTimer` to hide after `durationSec`
- After auto-hide completes, calls `startAutoRotation()` to resume the rotation cycle
- Includes logging for debugging

**Code**:
```javascript
// FIXED: If auto-rotate is enabled, schedule auto-hide and resume rotation cycle
if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
  const durationMs = state.ticker.settings.durationSec * 1000;
  logger.info('Manual show with auto-rotation enabled - scheduling auto-hide', {
    durationSec: state.ticker.settings.durationSec
  });

  autoHideTimer = setTimeout(() => {
    state.ticker.enabled = false;
    broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
    broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
    autoHideTimer = null;

    // Resume auto-rotation cycle after manual show completes
    logger.info('Manual show auto-hide complete - resuming rotation cycle');
    startAutoRotation();
  }, durationMs);
}
```

### Fix #2: Manual Hide Restarts Auto-Rotation
**File**: `server.js` lines 1466-1470

**Changes**:
- Added conditional logic to restart auto-rotation after manual hide
- Checks if `autoRotate` is enabled and `intervalMin > 0`
- Calls `startAutoRotation()` to restart the rotation cycle
- Includes logging for debugging

**Code**:
```javascript
// FIXED: If auto-rotate is enabled, restart the rotation cycle
if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
  logger.info('Manual hide with auto-rotation enabled - restarting rotation cycle');
  startAutoRotation();
}
```

### Fix #3: Client-Side Failsafe Timeout
**File**: `output.html` TickerManager class

**Changes**:
- Added `failsafeTimeout` property to TickerManager constructor
- In `show()` method: Sets a failsafe timeout at 2x the expected duration
- If failsafe triggers, automatically hides the ticker and logs a warning
- In `hide()` method: Clears the failsafe timeout
- In `destroy()` method: Clears the failsafe timeout on cleanup

**Code**:
```javascript
// FAILSAFE: Client-side auto-hide backup (uses 2x duration as safety margin)
// This prevents ticker from staying visible indefinitely if server fails
if (interval > 0 && duration > 0) {
  const failsafeMs = duration * 2000; // 2x duration in milliseconds
  console.log(`[Ticker] Failsafe timeout set: ${failsafeMs}ms (2x ${duration}s)`);

  if (this.failsafeTimeout) {
    clearTimeout(this.failsafeTimeout);
  }

  this.failsafeTimeout = setTimeout(() => {
    if (this.isVisible) {
      console.warn('[Ticker] Failsafe auto-hide triggered - server did not send hide command');
      this.hide();
    }
    this.failsafeTimeout = null;
  }, failsafeMs);
}
```

## How Auto-Rotation Now Works

### Normal Auto-Rotation Flow
1. `startAutoRotation()` is called (on server startup or after manual hide)
2. Waits `intervalMin` minutes (via `autoRotateTimer`)
3. Shows ticker and broadcasts to clients
4. Sets `autoHideTimer` for `durationSec` seconds
5. Hides ticker after duration expires
6. Calls `startAutoRotation()` again (recursive cycle)

### Manual Show Flow (with auto-rotation enabled)
1. User clicks "Show Ticker" button
2. Server clears existing timers
3. Server shows ticker immediately
4. Server sets `autoHideTimer` for `durationSec` seconds
5. After duration, ticker hides and calls `startAutoRotation()`
6. Normal rotation cycle resumes

### Manual Hide Flow (with auto-rotation enabled)
1. User clicks "Hide Ticker" button
2. Server clears existing timers
3. Server hides ticker immediately
4. Server calls `startAutoRotation()` to restart the cycle
5. Normal rotation cycle resumes (waits `intervalMin` before next show)

### Client Failsafe Protection
1. When ticker shows, client sets failsafe at 2x `durationSec`
2. If server sends hide command normally, failsafe is cleared
3. If server fails to send hide command, failsafe triggers at 2x duration
4. Client automatically hides ticker and logs warning
5. Prevents indefinite visibility

## Testing Recommendations

### Test Case 1: Manual Show with Auto-Rotation
1. Enable auto-rotation in Ticker settings
2. Set `intervalMin = 5` and `durationSec = 10`
3. Click "Show Ticker" manually
4. **Expected**: Ticker should auto-hide after 10 seconds
5. **Expected**: Ticker should re-appear after 5 minutes

### Test Case 2: Manual Hide with Auto-Rotation
1. Enable auto-rotation in Ticker settings
2. Set `intervalMin = 5` and `durationSec = 10`
3. Wait for ticker to show automatically
4. Click "Hide Ticker" manually before it auto-hides
5. **Expected**: Ticker should re-appear after 5 minutes

### Test Case 3: Failsafe Triggers (simulated failure)
1. Enable auto-rotation with `intervalMin = 5`, `durationSec = 10`
2. Show ticker manually
3. **Expected**: Ticker should hide at 10 seconds (normal server behavior)
4. **Expected**: If server fails, ticker should hide at 20 seconds (failsafe)
5. Check browser console for failsafe warning message

### Test Case 4: Settings Change During Visible Ticker
1. Show ticker with `durationSec = 10`
2. While ticker is visible, change `durationSec = 5`
3. Click "Save Settings"
4. **Expected**: Auto-rotation restarts with new settings
5. **Expected**: Current visible ticker behavior depends on whether manual or auto-shown

## Configuration Files Modified

- `server.js` - Auto-rotation logic fixes (2 locations)
- `output.html` - Client-side failsafe timeout (3 locations)

## Breaking Changes

None. All changes are backward compatible and enhance existing behavior.

## Migration Notes

No migration required. Fixes are automatically applied on next server restart.

## Monitoring

### Server Logs to Watch
- `Manual show with auto-rotation enabled - scheduling auto-hide`
- `Manual show auto-hide complete - resuming rotation cycle`
- `Manual hide with auto-rotation enabled - restarting rotation cycle`

### Client Console Logs to Watch
- `[Ticker] Failsafe timeout set: Xms (2x Ys)`
- `[Ticker] Failsafe auto-hide triggered - server did not send hide command` (warning - investigate if seen)

## Related Issues

These fixes resolve the following behaviors:
- Ticker staying visible indefinitely after manual show
- Auto-rotation stopping after manual interaction
- No client-side protection against stuck ticker
- Interval settings being ignored after manual control
