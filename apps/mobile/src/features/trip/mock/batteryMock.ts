export interface BatteryBrand {
  id: string;
  name: string;
  steps: string[];
}

export const BATTERY_BRANDS: BatteryBrand[] = [
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    steps: [
      'Open Settings and select Battery',
      'Set SafeSafar battery saver to No restrictions',
      'Enable Autostart for SafeSafar in app settings',
    ],
  },
  {
    id: 'oppo',
    name: 'Oppo',
    steps: [
      'Open Settings and select Battery',
      'Allow background activity with No restrictions',
      'Enable Autostart in startup management',
    ],
  },
  {
    id: 'vivo',
    name: 'Vivo',
    steps: [
      'Open Settings and select Battery',
      'Set high background power consumption to allow',
      'Enable Autostart in permission management',
    ],
  },
];
