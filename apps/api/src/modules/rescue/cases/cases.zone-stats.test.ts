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
  // La decision de S2 es que 'at_risk' se comporta como 'found'. Sin este
  // pliegue en el SQL, activeCases (que cuenta los tres tipos) queda por
  // encima de found + lost apenas exista un caso at_risk en la zona.
  it('pliega los casos at_risk dentro del contador found', async () => {
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

    expect(sqlOf(0)).toContain(`c.listing_type IN ('found', 'at_risk')`);
  });

  it('devuelve found + lost sumando activeCases cuando hay un caso at_risk', async () => {
    // Fila simulada: 1 found real + 1 at_risk (ya contado como found por el
    // SQL) + 1 lost = 3 activeCases.
    queryMock.mockResolvedValueOnce([{
      activeCases: '3',
      resolvedThisMonth: '0',
      critica: '0',
      alta: '0',
      media: '0',
      baja: '3',
      found: '2',
      lost: '1',
    }]);

    const stats = await getZoneStats({ lat: -34.6, lng: -58.4, radius: 10 });

    expect(stats.byListingType.found + stats.byListingType.lost).toBe(stats.activeCases);
  });
});
