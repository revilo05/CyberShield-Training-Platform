import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { calculateCyberRiskScore } from './modules/risk-score/risk-score.service.js';
import { trainingModules } from './modules/training/training-modules.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cybershield-api' });
});

app.get('/api/training/modules', (_req, res) => {
  res.json({ data: trainingModules });
});

app.post('/api/risk-score/preview', (req, res) => {
  const score = calculateCyberRiskScore(req.body);
  res.json({ data: score });
});

app.listen(port, () => {
  console.log(`CyberShield API running on http://localhost:${port}`);
});
