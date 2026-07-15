export enum Grade {
  NORMAL = 'NORMAL',
  GOLD = 'GOLD',
  VIP = 'VIP',
}

export interface Customer {
  id: number;
  name: string;
  grade: Grade;
}
