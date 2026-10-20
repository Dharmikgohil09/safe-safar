export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
  ts: number;
}

export type SosSource = 'button' | 'shake' | 'voice' | 'fakecall' | 'duress';
export type SosStatus = 'active' | 'resolved';

export interface Device {
  userId: string;
  deviceKey: string; // secret, sent by the phone in the x-device-key header
  linkCode: string; // short code a contact sends to the Telegram bot: /start <linkCode>
  userName: string;
}

export interface SosRecord {
  sosId: string;
  userId: string;
  userName: string;
  source: SosSource;
  status: SosStatus;
  trackingToken: string; // goes in the public tracking link, never guessable
  startedAt: number;
  resolvedAt?: number;
  lastCoords?: Coords;
  trail: Coords[]; // capped
}

export interface Store {
  getDeviceByUser(userId: string): Promise<Device | null>;
  saveDevice(d: Device): Promise<void>;
  getDeviceByLinkCode(code: string): Promise<Device | null>;
  addChat(userId: string, chatId: string): Promise<void>;
  getChats(userId: string): Promise<string[]>;
  getSos(sosId: string): Promise<SosRecord | null>;
  getSosByToken(token: string): Promise<SosRecord | null>;
  saveSos(r: SosRecord): Promise<void>;
}
