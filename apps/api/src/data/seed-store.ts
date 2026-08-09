import type { RiskScore, Simulation, SimulationResult, TrainingModule, TrainingProgress, User } from '../core/models.js';
import { TrainingModuleFactoryProvider } from '../modules/training/training-module.factory.js';

const phishingFactory = TrainingModuleFactoryProvider.for('PHISHING');
const passwordsFactory = TrainingModuleFactoryProvider.for('PASSWORDS');
const socialFactory = TrainingModuleFactoryProvider.for('SOCIAL_ENGINEERING');

const trainingModules: TrainingModule[] = [
  phishingFactory.create({
    id: 'phishing-101',
    title: 'Detectar correos de phishing',
    estimatedMinutes: 8,
    description: 'Aprende a identificar remitentes falsos, enlaces sospechosos y mensajes que intentan generar urgencia.',
    lessons: [
      { title: 'Verifica el remitente', content: 'Comprueba el dominio completo y desconfía de pequeñas variaciones en el nombre.' },
      { title: 'Inspecciona antes de actuar', content: 'No abras enlaces o adjuntos inesperados. Confirma la solicitud por un canal conocido.' },
      { title: 'Reporta la amenaza', content: 'Usa el canal interno de seguridad para proteger también al resto del equipo.' }
    ]
  }),
  passwordsFactory.create({
    id: 'passwords-101',
    title: 'Contraseñas seguras y MFA',
    estimatedMinutes: 6,
    description: 'Crea credenciales resistentes, usa gestores de contraseñas y activa autenticación multifactor.',
    lessons: [
      { title: 'Una clave por servicio', content: 'La reutilización permite que una filtración comprometa varias cuentas.' },
      { title: 'Frases largas', content: 'Prefiere frases únicas, largas y fáciles de recordar sobre combinaciones predecibles.' },
      { title: 'Activa MFA', content: 'Una segunda verificación reduce el impacto de una contraseña robada.' }
    ]
  }),
  socialFactory.create({
    id: 'social-engineering-101',
    title: 'Ingeniería social en el trabajo',
    estimatedMinutes: 10,
    description: 'Reconoce llamadas, mensajes y solicitudes falsas que explotan la confianza y la presión.',
    lessons: [
      { title: 'Pausa ante la presión', content: 'La urgencia y la autoridad aparente son tácticas comunes de manipulación.' },
      { title: 'Verifica la identidad', content: 'Confirma solicitudes sensibles mediante un canal corporativo independiente.' },
      { title: 'Protege la información', content: 'Nunca compartas códigos, credenciales o datos internos sin autorización.' }
    ]
  })
];

const users: User[] = [
  { id: 'user-ana', companyId: 'company-cybershield', fullName: 'Ana Martínez', email: 'empleado@cybershield.demo', role: 'EMPLOYEE', department: 'Operaciones' },
  { id: 'user-carlos', companyId: 'company-cybershield', fullName: 'Carlos Peña', email: 'supervisor@cybershield.demo', role: 'SUPERVISOR', department: 'Tecnología' },
  { id: 'user-laura', companyId: 'company-cybershield', fullName: 'Laura Gómez', email: 'admin@cybershield.demo', role: 'ADMIN', department: 'Seguridad' },
  { id: 'user-diego', companyId: 'company-cybershield', fullName: 'Diego Ruiz', email: 'diego@cybershield.demo', role: 'EMPLOYEE', department: 'Finanzas' },
  { id: 'user-sofia', companyId: 'company-cybershield', fullName: 'Sofía Reyes', email: 'sofia@cybershield.demo', role: 'EMPLOYEE', department: 'Ventas' }
];

const simulations: Simulation[] = [
  {
    id: 'invoice-phishing', title: 'Factura pendiente urgente', category: 'PHISHING',
    scenario: 'Recibes un correo que exige pagar una factura hoy para evitar la suspensión del servicio. El enlace apunta a “micr0soft-billing.example”.',
    sender: 'Facturación Microsoft <billing@micr0soft-alerts.example>', subject: 'URGENTE: su cuenta será suspendida hoy', difficulty: 'BASIC',
    options: [
      { id: 'open-link', label: 'Abrir el enlace e iniciar sesión para revisar la factura' },
      { id: 'reply', label: 'Responder solicitando más información' },
      { id: 'report', label: 'Reportar el correo y verificar la factura desde el portal oficial', reportsThreat: true }
    ],
    correctOptionId: 'report',
    successFeedback: 'Correcto. Detectaste el dominio alterado y evitaste interactuar con el mensaje.',
    failureFeedback: 'La urgencia y el dominio alterado son señales de phishing. Repórtalo y entra al portal desde un marcador confiable.'
  },
  {
    id: 'executive-request', title: 'Solicitud del director por chat', category: 'SOCIAL_ENGINEERING',
    scenario: 'Una cuenta con la foto del director te escribe por mensajería personal. Dice estar en una reunión y pide comprar tarjetas de regalo sin avisar a nadie.',
    sender: '“Director General” (cuenta externa)', subject: 'Necesito tu ayuda, es confidencial', difficulty: 'INTERMEDIATE',
    options: [
      { id: 'comply', label: 'Comprar las tarjetas porque la solicitud viene del director' },
      { id: 'ask-code', label: 'Pedirle por chat un dato interno para verificarlo' },
      { id: 'verify', label: 'Detenerse, verificar por el canal corporativo y reportar la cuenta', reportsThreat: true }
    ],
    correctOptionId: 'verify',
    successFeedback: 'Muy bien. Verificaste la identidad por un canal independiente y reportaste el intento.',
    failureFeedback: 'Las solicitudes confidenciales y urgentes fuera de canales oficiales deben verificarse antes de actuar.'
  }
];

const now = new Date().toISOString();
const trainingProgress: TrainingProgress[] = [
  { userId: 'user-ana', moduleId: 'passwords-101', status: 'COMPLETED', progressPercent: 100, updatedAt: now, completedAt: now },
  { userId: 'user-ana', moduleId: 'phishing-101', status: 'IN_PROGRESS', progressPercent: 45, updatedAt: now },
  { userId: 'user-carlos', moduleId: 'phishing-101', status: 'COMPLETED', progressPercent: 100, updatedAt: now, completedAt: now },
  { userId: 'user-carlos', moduleId: 'passwords-101', status: 'COMPLETED', progressPercent: 100, updatedAt: now, completedAt: now },
  { userId: 'user-laura', moduleId: 'phishing-101', status: 'COMPLETED', progressPercent: 100, updatedAt: now, completedAt: now },
  { userId: 'user-laura', moduleId: 'passwords-101', status: 'COMPLETED', progressPercent: 100, updatedAt: now, completedAt: now },
  { userId: 'user-laura', moduleId: 'social-engineering-101', status: 'COMPLETED', progressPercent: 100, updatedAt: now, completedAt: now },
  { userId: 'user-diego', moduleId: 'phishing-101', status: 'IN_PROGRESS', progressPercent: 25, updatedAt: now },
  { userId: 'user-sofia', moduleId: 'social-engineering-101', status: 'COMPLETED', progressPercent: 100, updatedAt: now, completedAt: now }
];

const simulationResults: SimulationResult[] = [
  { id: 'result-1', userId: 'user-ana', simulationId: 'invoice-phishing', selectedOptionId: 'open-link', wasSuccessful: false, reportedThreat: false, feedback: simulations[0].failureFeedback, completedAt: now },
  { id: 'result-2', userId: 'user-diego', simulationId: 'invoice-phishing', selectedOptionId: 'open-link', wasSuccessful: false, reportedThreat: false, feedback: simulations[0].failureFeedback, completedAt: now },
  { id: 'result-3', userId: 'user-diego', simulationId: 'invoice-phishing', selectedOptionId: 'reply', wasSuccessful: false, reportedThreat: false, feedback: simulations[0].failureFeedback, completedAt: now },
  { id: 'result-4', userId: 'user-sofia', simulationId: 'executive-request', selectedOptionId: 'verify', wasSuccessful: true, reportedThreat: true, feedback: simulations[1].successFeedback, completedAt: now },
  { id: 'result-5', userId: 'user-carlos', simulationId: 'invoice-phishing', selectedOptionId: 'report', wasSuccessful: true, reportedThreat: true, feedback: simulations[0].successFeedback, completedAt: now }
];

export const store = {
  companies: [{ id: 'company-cybershield', name: 'CyberShield Demo Corp', industry: 'Servicios profesionales' }],
  users, trainingModules, trainingProgress, simulations, simulationResults,
  riskScores: [] as RiskScore[]
};
