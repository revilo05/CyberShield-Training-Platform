import { createHash, randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import type { ContentDraft, ScenarioDraftPayload } from '@cybershield/shared';
import type { AppConfig } from '../../config/env.js';
import type { PlatformRepository } from '../../core/enterprise-models.js';

export const draftRequestSchema = z.object({
  industry: z.string().min(2).max(80), department: z.string().min(2).max(80), objective: z.string().min(10).max(400),
  technique: z.string().regex(/^T\d{4}(\.\d{3})?$/), channel: z.enum(['EMAIL', 'CHAT', 'VOICE', 'WEB', 'APP', 'QR']).default('EMAIL')
}).strict();

const payloadSchema = z.object({
  title: z.string(), category: z.string(), channel: z.enum(['EMAIL', 'CHAT', 'VOICE', 'WEB', 'APP', 'QR']), subject: z.string(), senderName: z.string(), senderAddress: z.string(), scenario: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string(), isExpected: z.boolean() })).min(2), feedback: z.object({ success: z.string(), failure: z.string() }), observableCues: z.array(z.string()).min(3),
  difficultyScore: z.number().int().min(1).max(100), premiseAlignment: z.enum(['LOW', 'MEDIUM', 'HIGH']), audienceTags: z.array(z.string()), mitreTechniqueIds: z.array(z.string()), expectedBehavior: z.string(), sourceUrls: z.array(z.string().url())
});

function localDraft(input: z.infer<typeof draftRequestSchema>): ScenarioDraftPayload {
  return { title: `Solicitud urgente para ${input.department}`, category: 'SOCIAL_ENGINEERING', channel: input.channel, subject: 'Acción requerida antes del cierre', senderName: 'Equipo de Operaciones', senderAddress: 'operaciones@empresa-segura.example', scenario: `En una empresa de ${input.industry}, recibes una solicitud urgente vinculada a: ${input.objective}. El dominio y el contexto presentan señales que deben verificarse por un canal independiente.`, options: [{ id: 'report', label: 'Reportar y verificar por un canal conocido', isExpected: true }, { id: 'act', label: 'Cumplir la solicitud para evitar el retraso', isExpected: false }, { id: 'reply', label: 'Responder al remitente solicitando confirmación', isExpected: false }], feedback: { success: 'Correcto: preservaste la evidencia y verificaste por un canal independiente.', failure: 'La urgencia no sustituye la verificación. Reporta el mensaje y contacta al responsable por un canal conocido.' }, observableCues: ['Urgencia inusual', 'Cambio de procedimiento', 'Remitente o dominio no verificado'], difficultyScore: 55, premiseAlignment: 'HIGH', audienceTags: [input.department], mitreTechniqueIds: [input.technique], expectedBehavior: 'Reportar, no interactuar y verificar por un canal independiente.', sourceUrls: ['https://attack.mitre.org/techniques/T1566/', 'https://www.cisa.gov/secure-our-world/recognize-and-report-phishing'] };
}

export class ContentAuthoringService {
  private readonly client?: OpenAI;
  constructor(private readonly repository: PlatformRepository, private readonly config: AppConfig) { if (config.openai.apiKey) this.client = new OpenAI({ apiKey: config.openai.apiKey }); }

  async create(companyId: string, requestedBy: string, rawInput: unknown): Promise<ContentDraft> {
    const input = draftRequestSchema.parse(rawInput);
    let payload = localDraft(input); let model = 'deterministic-template';
    if (this.client) {
      const schema = { type: 'object', additionalProperties: false, required: Object.keys(payload), properties: {
        title: { type: 'string' }, category: { type: 'string' }, channel: { type: 'string', enum: ['EMAIL','CHAT','VOICE','WEB','APP','QR'] }, subject: { type: 'string' }, senderName: { type: 'string' }, senderAddress: { type: 'string' }, scenario: { type: 'string' },
        options: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id','label','isExpected'], properties: { id: { type: 'string' }, label: { type: 'string' }, isExpected: { type: 'boolean' } } } },
        feedback: { type: 'object', additionalProperties: false, required: ['success','failure'], properties: { success: { type: 'string' }, failure: { type: 'string' } } }, observableCues: { type: 'array', items: { type: 'string' } }, difficultyScore: { type: 'integer', minimum: 1, maximum: 100 }, premiseAlignment: { type: 'string', enum: ['LOW','MEDIUM','HIGH'] }, audienceTags: { type: 'array', items: { type: 'string' } }, mitreTechniqueIds: { type: 'array', items: { type: 'string' } }, expectedBehavior: { type: 'string' }, sourceUrls: { type: 'array', items: { type: 'string' } }
      }};
      const response = await this.client.responses.create({ model: this.config.openai.model, safety_identifier: createHash('sha256').update(`${companyId}:${requestedBy}`).digest('hex').slice(0, 64), input: [{ role: 'system', content: 'Redacta un borrador educativo defensivo en español. No incluyas PII, credenciales, malware, enlaces activos ni instrucciones de abuso. Exige revisión humana.' }, { role: 'user', content: JSON.stringify(input) }], text: { format: { type: 'json_schema', name: 'scenario_draft', strict: true, schema } } } as never);
      payload = payloadSchema.parse(JSON.parse(response.output_text)); model = this.config.openai.model;
    }
    const draft: ContentDraft = { id: randomUUID(), status: 'REVIEW', title: payload.title, contentType: 'SCENARIO', payload, model, promptVersion: 'scenario-author-v1', requestedBy, createdAt: new Date().toISOString() };
    await this.repository.createContentDraft(companyId, draft);
    await this.repository.appendAudit(companyId, requestedBy, 'content.draft.created', 'content_draft', draft.id, undefined, { model, piiIncluded: false });
    return draft;
  }
}
