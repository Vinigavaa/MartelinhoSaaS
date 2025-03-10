export interface Service {
  id: string;
  client_name: string;
  service_date: string;
  car_plate: string;
  car_model: string;
  service_value: number;
  repaired_parts: string[];
  created_at: string;
  updated_at: string;
}

export const REPAIRED_PARTS = [
  'capo',
  'teto',
  'tampa traseira',
  'paralama dianteiro esquerdo',
  'paralama dianteiro direito',
  'porta dianteira esquerda',
  'porta dianteira direita',
  'porta traseira esquerda',
  'porta traseira direita',
  'lateral traseira esquerda',
  'lateral traseira direita',
  'parachoque dianteiro',
  'parachoque traseiro',
  'coluna lado esquerdo',
  'coluna lado direito',
  'polimento',
  'pintura',
  'outros'
] as const;

export type RepairedPart = typeof REPAIRED_PARTS[number];