export interface WalkMeHomeContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  selected: boolean;
}

export const DEFAULT_DESTINATION = 'SVNIT, Surat';
export const DEFAULT_CHECK_IN_MINUTES = 12;
export const DEFAULT_CHECK_IN_SECONDS = DEFAULT_CHECK_IN_MINUTES * 60;

export const mockWalkMeHomeContacts: WalkMeHomeContact[] = [
  {
    id: 'contact-1',
    name: 'Mom',
    phone: '+91 98765 43210',
    relationship: 'Family',
    selected: true,
  },
  {
    id: 'contact-2',
    name: 'Ananya (Friend)',
    phone: '+91 87654 32109',
    relationship: 'Friend',
    selected: false,
  },
  {
    id: 'contact-3',
    name: 'Rohit (Sibling)',
    phone: '+91 76543 21098',
    relationship: 'Sibling',
    selected: false,
  },
];
