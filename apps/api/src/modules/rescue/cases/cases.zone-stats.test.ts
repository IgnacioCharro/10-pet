import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db', () => ({
  sequelize: { query: vi.fn() },
}));

import { sequelize } from '../../../db';
import { getZoneStats } from './cases.zone-stats';

const queryMock = vi.mocked(
  sequelize.query as unknown as (
    sql: string,
    options?: { replacements?: Record<string, unknown> },
  ) => Promise<unknown[]>,
);

const sqlOf = (call: number): string => String(queryMock.mock.calls[call]?.[0] ?? '');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getZoneStats — byListingType', () => {
  it('cuenta los found sin plegar ningun otro tipo', async () => {
    queryMock.mockResolvedValueOnce([{
      activeCases: '3',
      resolvedThisMonth: '0',
      critica: '0',
      alta: '0',
      media: '0',
      baja: '3',
      found: '3',
      lost: '0',
    }]);

    await getZoneStats({ lat: -34.6, lng: -58.4, radius: 10 });

    expect(sqlOf(0)).toContain(`c.listing_type = 'found'`);
  });
});
