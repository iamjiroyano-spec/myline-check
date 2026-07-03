## Drag-and-drop reordering (synced)

Enable users to rearrange:
1. **Station cards** on the Shift Overview dashboard (BAR, NIKKEI, etc.).
2. **Categories** and **items within a category** on the station editor page.

Order is stored per user and syncs across devices via the existing `user_state` sync path (no schema changes needed).

### Library
Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — accessible, keyboard-friendly, works on touch.

### Storage keys (localStorage, auto-synced by `src/lib/sync.ts`)
- `linecheck:order:stations` → `string[]` of station names in preferred order.
- `linecheck:order:section:<sectionName>:categories` → `string[]` of category names.
- `linecheck:order:section:<sectionName>:items:<categoryName>` → `string[]` of item names.

Unknown/new stations/categories/items fall back to their original order at the end. Deleted names are pruned on read.

### Files touched

**`src/lib/order.ts`** (new)
- `getStationOrder()`, `setStationOrder(names)`.
- `getCategoryOrder(section)`, `setCategoryOrder(section, names)`.
- `getItemOrder(section, category)`, `setItemOrder(section, category, names)`.
- Helper `applyOrder<T>(items, orderedKeys, keyFn)` that returns items sorted by saved order with unknowns appended.
- All writes go through `lsStore` so `linecheck:local-write` fires and `sync.ts` pushes to `user_state`.

**`src/routes/index.tsx`**
- Wrap the Stations grid in `DndContext` + `SortableContext`.
- Apply `getStationOrder()` to `stats.perStation` before rendering.
- Each station card becomes a `useSortable` item with a small drag handle (grip icon) so tapping the card still opens the station.
- On drag end: reorder array, call `setStationOrder(...)`.

**`src/routes/section.$name.tsx`**
- Sort `draft` categories with `getCategoryOrder(section)`; each category's items sorted with `getItemOrder(section, category)`.
- Wrap the category list in a `DndContext` for category reordering (drag handle on the category header).
- Inside each category, wrap items in a nested `SortableContext` for item reordering (drag handle at the row's left edge, next to the check control).
- On drag end persist via `setCategoryOrder` / `setItemOrder`.
- Reordering does NOT modify item content, checked state, or the CSV import/download logic.

### UX details
- Drag handle: small `GripVertical` icon; the rest of the row/card remains clickable/tappable as today.
- Keyboard drag supported via dnd-kit sensors.
- Reduced motion respected via dnd-kit defaults.
- Locked when no team member selected (same guard as opening stations) — handle hidden.

### Sync
No DB changes. New keys are `linecheck:*`, already captured by `collectSnapshot()` and hydrated on sign-in by `pullFromServer()` in `src/lib/sync.ts` — order propagates to other devices automatically.
