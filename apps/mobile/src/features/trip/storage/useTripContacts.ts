import { useCallback, useEffect, useState } from 'react';
import { getTripContacts } from './contactsStorage';

export interface TripContact {
  id: string;
  name: string;
  phone: string;
  selected: boolean;
}

export function useTripContacts() {
  const [contacts, setContacts] = useState<TripContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await getTripContacts();
      setContacts(
        stored.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          selected: true,
        }))
      );
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { contacts, loading, reload };
}
