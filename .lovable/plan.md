

## Briefing Panel Query Improvements

**File: `src/components/views/BriefingPanel.tsx` only**

### Changes

1. Add `URGENCY_ORDER` constant and `processInsights()` helper function (sorting by urgency priority, then `created_at` desc; max 3 per cluster; max 12 total).

2. Update `fetchInsights`:
   - Increase query `.limit(50)` (from 20) for enough candidates.
   - Calculate `sinceYesterday` from the **raw** fetched data (before filtering).
   - Apply `processInsights(data)` for the display list only.

3. "Since yesterday" count uses raw data:
```typescript
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const count = rows.filter(r => r.created_at && r.created_at > yesterday.toISOString()).length;
setSinceYesterday(count);

const processed = processInsights(rows);
setInsights(processed);
```

### Technical Details

**New helper (added above the component):**

```typescript
const URGENCY_ORDER: Record<string, number> = { urgent: 0, emerging: 1, monitor: 2 };

function processInsights(raw: InsightRow[]): InsightRow[] {
  const sorted = [...raw].sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency] ?? 3;
    const ub = URGENCY_ORDER[b.urgency] ?? 3;
    if (ua !== ub) return ua - ub;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });

  const result: InsightRow[] = [];
  const clusterCount: Record<string, number> = {};

  for (const row of sorted) {
    if (result.length >= 12) break;
    const key = row.cluster_name;
    if (key) {
      const count = clusterCount[key] ?? 0;
      if (count >= 3) continue;
      clusterCount[key] = count + 1;
    }
    result.push(row);
  }
  return result;
}
```

**Modified `fetchInsights`:** Only the post-fetch logic changes -- sinceYesterday computed from raw `data`, then `processInsights(data)` applied separately for `setInsights`. Query limit bumped from 20 to 50.

No other files touched.
