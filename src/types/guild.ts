export type TeamSide = 'blue' | 'red';

export interface GuildMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Guild Leader' | 'Senior SRE' | 'Chaos Specialist' | 'DevOps Engineer' | 'Cadet';
  team: TeamSide;
  online: boolean;
  score: number;
  badgesCount: number;
  lastAction: string;
}

export interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  logo: string;
  members: GuildMember[];
  scoreBlue: number;
  scoreRed: number;
  totalMitigated: number;
  totalInjected: number;
}

export interface BattleEvent {
  id: string;
  timestamp: number;
  type: 'attack' | 'defense';
  actorName: string;
  actorTeam: TeamSide;
  description: string;
  points: number;
  target: string;
}

export const INITIAL_GUILDS: Guild[] = [
  {
    id: 'guild-ion-titans',
    name: 'ION DevOps Titans',
    tag: 'ION-TITANS',
    description: 'Esquadrão de operações e resiliência de produção da ION Sistemas.',
    logo: '🛡️',
    scoreBlue: 2450,
    scoreRed: 2180,
    totalMitigated: 34,
    totalInjected: 29,
    members: [
      {
        id: 'member-1',
        name: 'Max Sena',
        email: 'max.sena@ionsistemas.com.br',
        avatar: '👨‍💻',
        role: 'Guild Leader',
        team: 'blue',
        online: true,
        score: 1250,
        badgesCount: 5,
        lastAction: 'Mitigou Memory Leak em analytics-worker',
      },
      {
        id: 'member-2',
        name: 'Rafael Costa',
        email: 'rafael.costa@ionsistemas.com.br',
        avatar: '⚡',
        role: 'Chaos Specialist',
        team: 'red',
        online: true,
        score: 1100,
        badgesCount: 4,
        lastAction: 'Injetou Cyber Storm DDoS (5000 RPS)',
      },
      {
        id: 'member-3',
        name: 'Camila Duarte',
        email: 'camila.duarte@ionsistemas.com.br',
        avatar: '👩‍💻',
        role: 'Senior SRE',
        team: 'blue',
        online: true,
        score: 980,
        badgesCount: 4,
        lastAction: 'Configurou HPA 70% CPU em payment-gateway',
      },
      {
        id: 'member-4',
        name: 'Lucas Ferreira',
        email: 'lucas.ferreira@ionsistemas.com.br',
        avatar: '🔥',
        role: 'Chaos Specialist',
        team: 'red',
        online: true,
        score: 840,
        badgesCount: 3,
        lastAction: 'Corrompeu Liveness Probe em frontend-edge',
      },
      {
        id: 'member-5',
        name: 'Beatriz Lima',
        email: 'beatriz.lima@ionsistemas.com.br',
        avatar: '🎯',
        role: 'DevOps Engineer',
        team: 'blue',
        online: false,
        score: 620,
        badgesCount: 2,
        lastAction: 'Drenou node-prod-pool-01 sem downtime',
      },
    ],
  },
  {
    id: 'guild-cloud-guardians',
    name: 'Cloud Knights ION',
    tag: 'ION-KNIGHTS',
    description: 'Guardiões de infraestrutura distribuída e finops.',
    logo: '⚔️',
    scoreBlue: 1890,
    scoreRed: 1720,
    totalMitigated: 22,
    totalInjected: 19,
    members: [
      {
        id: 'member-6',
        name: 'Gabriel Souza',
        email: 'gabriel.souza@ionsistemas.com.br',
        avatar: '🧙‍♂️',
        role: 'Guild Leader',
        team: 'blue',
        online: true,
        score: 950,
        badgesCount: 3,
        lastAction: 'Aplicou Right-Sizing FinOps (+18% economia)',
      },
      {
        id: 'member-7',
        name: 'Juliana Mendes',
        email: 'juliana.mendes@ionsistemas.com.br',
        avatar: '🌪️',
        role: 'Chaos Specialist',
        team: 'red',
        online: true,
        score: 880,
        badgesCount: 3,
        lastAction: 'Injetou falha de rede inter-pod',
      },
    ],
  },
];
