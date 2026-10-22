import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service.js';
import { AuditRepository } from './audit.repository.js';

describe('AuditService', () => {
  let service: AuditService;
  let repo: Partial<Record<keyof AuditRepository, any>>;

  beforeEach(() => {
    repo = {
      listAuditLogs: vi.fn(),
    };
    service = new AuditService(repo as unknown as AuditRepository);
  });

  it('queries audit logs with pagination', async () => {
    repo.listAuditLogs.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'log-1',
          action: 'ORDER_TRANSITIONED',
          entityType: 'Order',
          entityId: 'ord-1',
        },
      ],
      limit: 20,
      offset: 0,
    });

    const res = await service.listAuditLogs({ limit: 20, offset: 0 });
    expect(res.total).toBe(1);
    expect(res.items.length).toBe(1);
    expect(repo.listAuditLogs).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });
});
