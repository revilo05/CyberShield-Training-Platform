export type TrainingModule = {
  id: string;
  title: string;
  category: 'PHISHING' | 'PASSWORDS' | 'SOCIAL_ENGINEERING';
  estimatedMinutes: number;
  difficulty: 'BASIC' | 'INTERMEDIATE';
  description: string;
};

export const trainingModules: TrainingModule[] = [
  {
    id: 'phishing-101',
    title: 'Detectar correos de phishing',
    category: 'PHISHING',
    estimatedMinutes: 8,
    difficulty: 'BASIC',
    description: 'Aprende a identificar remitentes falsos, enlaces sospechosos y urgencias manipuladas.'
  },
  {
    id: 'passwords-101',
    title: 'Contraseñas seguras y MFA',
    category: 'PASSWORDS',
    estimatedMinutes: 6,
    difficulty: 'BASIC',
    description: 'Buenas prácticas para crear contraseñas, usar gestores y activar autenticación multifactor.'
  },
  {
    id: 'social-engineering-101',
    title: 'Ingeniería social en el trabajo',
    category: 'SOCIAL_ENGINEERING',
    estimatedMinutes: 10,
    difficulty: 'INTERMEDIATE',
    description: 'Escenarios de llamadas, mensajes y solicitudes falsas dentro del entorno laboral.'
  }
];
