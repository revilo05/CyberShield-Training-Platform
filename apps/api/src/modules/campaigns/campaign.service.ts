import type { Campaign } from '@cybershield/shared';
import type { CampaignCreateInput, PlatformRepository } from '../../core/enterprise-models.js';
import { HttpError } from '../../core/http-error.js';

const transitions: Record<Campaign['status'], Campaign['status'][]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'], SCHEDULED: ['RUNNING', 'PAUSED', 'CANCELLED'], RUNNING: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['SCHEDULED', 'RUNNING', 'CANCELLED'], COMPLETED: [], CANCELLED: []
};

export class CampaignService {
  constructor(private readonly repository: PlatformRepository) {}
  list(companyId: string) { return this.repository.listCampaigns(companyId); }
  scenarios(companyId: string) { return this.repository.listScenarioVersions(companyId); }
  async create(companyId: string, actorId: string, input: CampaignCreateInput, correlationId: string) {
    const campaign = await this.repository.createCampaign(companyId, actorId, input);
    await this.repository.appendAudit(companyId, actorId, 'campaign.created', 'campaign', campaign.id, correlationId, { targetCount: campaign.targetCount, scenarioVersionId: input.scenarioVersionId });
    return campaign;
  }
  async transition(companyId: string, campaignId: string, next: Campaign['status'], actorId: string, correlationId: string) {
    const campaign = await this.repository.getCampaign(companyId, campaignId);
    if (!campaign) throw new HttpError(404, 'Campaña no encontrada.');
    if (!transitions[campaign.status].includes(next)) throw new HttpError(409, `No se puede cambiar de ${campaign.status} a ${next}.`);
    if (next === 'SCHEDULED' && campaign.targetCount === 0) throw new HttpError(422, 'La campaña no tiene destinatarios elegibles.');
    const updated = await this.repository.transitionCampaign(companyId, campaignId, next, actorId);
    await this.repository.appendAudit(companyId, actorId, `campaign.${next.toLowerCase()}`, 'campaign', campaignId, correlationId, { previousStatus: campaign.status });
    return updated;
  }
}
