import { describe, it, expect } from 'vitest';
import {
  VOLUNTEER_COUNT_SUBQUERY,
  FEED_VOLUNTEER_COUNT_EXPR,
  buildListOrderBy,
  buildFeedOrderBy,
} from './cases.ordering';

describe('buildListOrderBy', () => {
  it('ordena por gravedad, luego menos voluntarios, luego recencia, luego id', () => {
    const orderBy = buildListOrderBy('urgency', false);

    const urgency = orderBy.indexOf('c.urgency_level DESC');
    const volunteers = orderBy.indexOf(VOLUNTEER_COUNT_SUBQUERY);
    const created = orderBy.indexOf('c.created_at DESC');
    const id = orderBy.indexOf('c.id DESC');

    expect(urgency).toBeGreaterThanOrEqual(0);
    expect(urgency).toBeLessThan(volunteers);
    expect(volunteers).toBeLessThan(created);
    expect(created).toBeLessThan(id);
  });

  it('cuenta voluntarios ascendente, solo contactos active o completed', () => {
    const orderBy = buildListOrderBy('urgency', true);

    expect(orderBy).toContain(`${VOLUNTEER_COUNT_SUBQUERY} ASC`);
    expect(orderBy).toContain(`vc.status IN ('active','completed')`);
    expect(orderBy).toContain('vc.case_id = c.id');
    expect(orderBy).not.toContain('pending');
    expect(orderBy).not.toContain('rejected');
  });

  it('deja el orden por recientes sin tocar', () => {
    const orderBy = buildListOrderBy('recent', false);

    expect(orderBy).toBe('c.created_at DESC');
    expect(orderBy).not.toContain('contacts');
  });

  it('deja el orden por cercania sin tocar', () => {
    const orderBy = buildListOrderBy('distance', true);

    expect(orderBy).toBe('distance_km ASC NULLS LAST');
    expect(orderBy).not.toContain('contacts');
  });
});

describe('buildFeedOrderBy', () => {
  it('deja la rama lost ordenada solo por recencia', () => {
    const orderBy = buildFeedOrderBy('lost');

    expect(orderBy).toBe('c.created_at DESC');
    expect(orderBy).not.toContain('contacts');
    expect(orderBy).not.toContain('COUNT');
  });

  it('ordena found y el feed sin filtro por gravedad, menos voluntarios, recencia e id', () => {
    const orderBy = buildFeedOrderBy('found');

    expect(buildFeedOrderBy(undefined)).toBe(orderBy);

    const urgency = orderBy.indexOf('c.urgency_level DESC');
    const volunteers = orderBy.indexOf(`${FEED_VOLUNTEER_COUNT_EXPR} ASC`);
    const created = orderBy.indexOf('c.created_at DESC');
    const id = orderBy.indexOf('c.id DESC');

    expect(urgency).toBeGreaterThanOrEqual(0);
    expect(urgency).toBeLessThan(volunteers);
    expect(volunteers).toBeLessThan(created);
    expect(created).toBeLessThan(id);
  });

  it('cuenta voluntarios del feed solo con contactos active o completed', () => {
    const orderBy = buildFeedOrderBy('found');

    expect(orderBy).toContain(`co.status IN ('active','completed')`);
    expect(orderBy).not.toContain('pending');
    expect(orderBy).not.toContain('rejected');
  });
});
