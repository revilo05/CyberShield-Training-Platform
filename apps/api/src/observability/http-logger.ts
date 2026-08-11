import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';

export const httpLogger = pinoHttp({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.token', 'req.body.content'], censor: '[REDACTED]' },
  genReqId(req, res) { const id = req.headers['x-correlation-id']?.toString() ?? randomUUID(); res.setHeader('x-correlation-id', id); return id; },
  customProps(req) { return { service: 'cybershield-api', correlationId: req.id }; }
});
