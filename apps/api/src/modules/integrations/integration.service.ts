import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import type { AppConfig } from '../../config/env.js';

export class IntegrationService {
  constructor(private readonly config: AppConfig) {}
  statuses() { return [
    { provider: 'AUTH0', status: this.config.auth0.configured ? 'CONFIGURED' : 'NOT_CONFIGURED', scopes: ['openid', 'profile', 'email'] },
    { provider: 'MICROSOFT_GRAPH', status: this.config.microsoft.configured ? 'CONFIGURED' : 'NOT_CONFIGURED', scopes: ['ThreatAssessment.ReadWrite.All'] },
    { provider: 'AWS_SES', status: this.config.aws.configured ? 'CONFIGURED' : 'NOT_CONFIGURED', scopes: ['ses:SendEmail'] },
    { provider: 'OPENAI', status: this.config.openai.configured ? 'CONFIGURED' : 'NOT_CONFIGURED', scopes: ['responses.write'] }
  ]; }
  async submitThreatAssessment(input: { contentType: 'mail' | 'url' | 'file'; content: string; expectedAssessment?: 'block' | 'unblock' }) {
    if (!this.config.microsoft.configured) throw new Error('Microsoft Graph no está configurado.');
    const credential = new ClientSecretCredential(this.config.microsoft.tenantId!, this.config.microsoft.clientId!, this.config.microsoft.clientSecret!);
    const client = Client.initWithMiddleware({ authProvider: { getAccessToken: async () => (await credential.getToken('https://graph.microsoft.com/.default'))!.token } });
    const type = input.contentType === 'mail' ? '#microsoft.graph.mailAssessmentRequest' : input.contentType === 'url' ? '#microsoft.graph.urlAssessmentRequest' : '#microsoft.graph.fileAssessmentRequest';
    return client.api('/informationProtection/threatAssessmentRequests').post({ '@odata.type': type, [input.contentType === 'mail' ? 'mail' : input.contentType === 'url' ? 'url' : 'contentData']: input.content, expectedAssessment: input.expectedAssessment ?? 'block', category: 'phishing' });
  }
}
