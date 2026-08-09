import { describe, expect, it, vi } from 'vitest';
import type { Campaign } from '@cybershield/shared';
import type { PlatformRepository } from '../../core/enterprise-models.js';
import { CampaignService } from './campaign.service.js';

const campaign: Campaign = { id: 'campaign-1', companyId: 'company-1', name: 'Pilot', scenarioVersionId: 'scenario-1', status: 'DRAFT', maxRecipients: 2000, targetCount: 12, createdAt: '2026-08-08T00:00:00Z' };
describe('CampaignService', () => {
  it('bloquea transiciones que evitan la aprobación', async () => {
    const repository = { getCampaign: vi.fn().mockResolvedValue(campaign) } as unknown as PlatformRepository;
    await expect(new CampaignService(repository).transition('company-1', campaign.id, 'RUNNING', 'admin-1', 'corr-1')).rejects.toMatchObject({ statusCode: 409 });
  });
  it('publica una campaña aprobada mediante el repositorio transaccional', async () => {
    const scheduled = { ...campaign, status: 'SCHEDULED' as const };
    const repository = { getCampaign: vi.fn().mockResolvedValue(campaign), transitionCampaign: vi.fn().mockResolvedValue(scheduled), appendAudit: vi.fn().mockResolvedValue(undefined) } as unknown as PlatformRepository;
    await expect(new CampaignService(repository).transition('company-1', campaign.id, 'SCHEDULED', 'admin-1', 'corr-1')).resolves.toEqual(scheduled);
    expect(repository.appendAudit).toHaveBeenCalledWith('company-1', 'admin-1', 'campaign.scheduled', 'campaign', campaign.id, 'corr-1', { previousStatus: 'DRAFT' });
  });
});
