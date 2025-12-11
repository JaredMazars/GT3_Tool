# Team Planner Gantt Drag & Drop - Testing Guide

## Implementation Summary

The drag-and-drop synchronization issues have been fixed by:

1. **Created `useDragDrop.ts` hook** - State machine-based drag handling with minimum drag distance
2. **Refactored `AllocationTile.tsx`** - Removed 100+ lines of complex position tracking logic
3. **Implemented React Query mutation** - Optimistic updates with automatic rollback on errors
4. **Fixed date calculations** - Normalized dates and consistent position calculations
5. **Added smooth transitions** - Cubic-bezier easing for position corrections

## Key Improvements

### Before
- Complex position tracking with multiple refs
- Tiles "jumped" after server updates
- Scale changes caused synchronization issues
- No optimistic updates (tiles froze during saves)
- 145+ lines of synchronization logic

### After
- Dates are single source of truth
- Positions calculated on-the-fly from dates
- Smooth transitions when server differs from client prediction
- Optimistic updates with immediate feedback
- Clean state machine: `idle → dragging → syncing → idle`

## Testing Checklist

Navigate to: `http://localhost:3000/dashboard/tax/TCN/clients/ee09e1bc-deea-4047-af94-91207a3fe45e/tasks/233408`

### ✅ Basic Drag Operations

- [ ] **Drag tile horizontally** - Tile should follow cursor smoothly
- [ ] **Minimum drag distance** - Small movements (< 5px) should not trigger drag
- [ ] **Click vs Drag** - Clicking without dragging should open the edit modal
- [ ] **Drop tile** - Tile should stay in new position immediately (optimistic update)
- [ ] **Server confirmation** - After drop, tile should remain stable (no jumping)

### ✅ Resize Operations

- [ ] **Resize from left edge** - Width should adjust correctly, end date stays fixed
- [ ] **Resize from right edge** - Width should adjust correctly, start date stays fixed
- [ ] **Minimum size** - Tile should not become smaller than half a column width
- [ ] **Visual feedback** - Resize handles should appear on hover

### ✅ Scale Changes

- [ ] **Switch to Day view** - Tiles should recalculate positions instantly
- [ ] **Switch to Week view** - Tiles should recalculate positions instantly
- [ ] **Switch to Month view** - Tiles should recalculate positions instantly
- [ ] **During drag** - Scale change should cancel the drag gracefully
- [ ] **After drop** - Scale change should show correct positions based on dates

### ✅ Server Synchronization

- [ ] **Successful save** - Tile stays in position, no visual change
- [ ] **Server differs slightly** - Tile should smoothly transition (0.3s) to corrected position
- [ ] **Network delay** - Tile should show syncing indicator (⏳) while waiting
- [ ] **Multiple quick drags** - No position conflicts or jumping

### ✅ Error Handling

- [ ] **Simulate server error** (disconnect network):
  - Drag a tile
  - Tile should revert smoothly to original position
  - Error message should appear
  - No tile left in limbo state

### ✅ Edge Cases

- [ ] **Drag near boundaries** - Tiles at start/end of timeline should handle correctly
- [ ] **Partial weeks/months** - Position calculations should be consistent
- [ ] **Very short allocations** - Minimum width should apply
- [ ] **Long allocations** - Should span multiple columns correctly

### ✅ Multi-User Scenario

- [ ] **Concurrent updates** - If another user updates same allocation, changes should sync smoothly

### ✅ Performance

- [ ] **Smooth 60fps** - No lag during drag operations
- [ ] **No memory leaks** - Event listeners properly cleaned up
- [ ] **Fast calculations** - Position updates should be instant

## Expected Behavior Details

### During Drag
1. Cursor changes to grabbing
2. Tile follows cursor with no lag
3. Preview dates update in real-time
4. Tooltip shows current dates
5. Tile slightly transparent (opacity: 0.8)
6. Z-index elevated (appears above other tiles)

### On Drop
1. Tile stays at new position (optimistic)
2. Syncing indicator (⏳) appears briefly
3. API call sent in background
4. No visual jump or flicker

### After Server Response
- **Success (dates match)**: No visual change
- **Success (dates differ)**: Smooth 0.3s transition to corrected position
- **Error**: Smooth revert to original position + error alert

### Scale Change
1. All tiles recalculate positions instantly
2. No intermediate states or jumps
3. Dates remain unchanged
4. Active drag is cancelled gracefully

## Known Behavior

### By Design
- Minimum drag distance of 5px prevents accidental drags
- Tiles round to nearest 0.5px to avoid sub-pixel rendering
- Month view uses 30-day average for width consistency
- Dates normalized to start-of-day for consistent calculations

### Smooth Transitions
- Transitions use `cubic-bezier(0.4, 0, 0.2, 1)` easing
- No transition during active drag/resize
- Smooth correction when server position differs

## Troubleshooting

### Tile Jumps After Drop
**Not Expected** - If this occurs:
- Check browser console for errors
- Verify API response contains correct dates
- Check that dates are in ISO format
- Ensure React Query cache is working

### Tile Doesn't Move
**Check**:
- User has ADMIN role (only admins can drag)
- Allocation has valid start/end dates
- `isDraggable` prop is true

### Position Calculation Issues
**Verify**:
- Dates are normalized to start-of-day
- Column width matches scale
- Date range covers allocation period

## Testing Results Template

```
Date: ___________
Tester: ___________

Basic Drag: ☐ Pass ☐ Fail
Resize: ☐ Pass ☐ Fail
Scale Changes: ☐ Pass ☐ Fail
Server Sync: ☐ Pass ☐ Fail
Error Handling: ☐ Pass ☐ Fail
Edge Cases: ☐ Pass ☐ Fail
Performance: ☐ Pass ☐ Fail

Issues Found:
1. 
2. 
3. 

Notes:


```

## Code References

### Key Files Modified
- `src/components/features/tasks/TeamPlanner/useDragDrop.ts` (new)
- `src/components/features/tasks/TeamPlanner/AllocationTile.tsx` (refactored)
- `src/components/features/tasks/TeamPlanner/GanttTimeline.tsx` (added mutation)
- `src/components/features/tasks/TeamPlanner/utils.ts` (fixed calculations)
- `src/components/features/tasks/TeamPlanner/ResourceRow.tsx` (updated props)

### State Machine
```
idle → dragging → syncing → idle
       ↓
     resizing → syncing → idle
```

### Position Calculation
```typescript
position = calculateTilePosition(
  dragState.previewDates || allocation,  // Use preview during drag
  dateRange,
  scale,
  columnWidth
);
```

## Next Steps After Testing

If all tests pass:
1. Mark testing todo as complete
2. Document any edge cases discovered
3. Consider adding unit tests for position calculations
4. Monitor production for any issues

If issues found:
1. Document exact reproduction steps
2. Note which test case failed
3. Provide browser console logs
4. Report to development team
