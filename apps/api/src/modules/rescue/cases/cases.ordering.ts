// ORDER BY builders for the case listings. No imports on purpose: this module
// only composes SQL fragments, so it stays testable without touching the DB.

// A volunteer is a contact already accepted ('active') or closed ('completed').
// Correlated scalar subquery for queries without a contacts join; alias vc avoids
// colliding with the co alias of getFeedCases.
export const VOLUNTEER_COUNT_SUBQUERY = `(SELECT COUNT(*) FROM contacts vc WHERE vc.case_id = c.id AND vc.status IN ('active','completed'))`;

// Same notion of volunteer for the feed, which groups by case: this is the one
// definition, interpolated both here and into the volunteerCount of the SELECT.
// Two copies would let the feed order by one rule and report another.
export const FEED_VOLUNTEER_COUNT_EXPR = `COUNT(co.id) FILTER (WHERE co.status IN ('active','completed'))`;

// Within the same urgency level the cases with fewer volunteers come first;
// c.id DESC keeps paging stable when created_at ties.
export function buildListOrderBy(
  sort: 'recent' | 'urgency' | 'distance',
  hasCoords: boolean,
): string {
  if (sort === 'urgency') {
    return `c.urgency_level DESC, ${VOLUNTEER_COUNT_SUBQUERY} ASC, c.created_at DESC, c.id DESC`;
  }
  if (sort === 'distance' && hasCoords) return 'distance_km ASC NULLS LAST';
  return 'c.created_at DESC';
}

// lost cases: most recent first; found cases (or all): urgency, then fewest volunteers
export function buildFeedOrderBy(listingType?: 'found' | 'lost'): string {
  if (listingType === 'lost') return 'c.created_at DESC';
  return `c.urgency_level DESC, ${FEED_VOLUNTEER_COUNT_EXPR} ASC, c.created_at DESC, c.id DESC`;
}
