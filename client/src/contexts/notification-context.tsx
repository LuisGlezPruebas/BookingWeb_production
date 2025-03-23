import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface NotificationContextType {
  pendingReservationsCount: number;
}

const defaultContext: NotificationContextType = {
  pendingReservationsCount: 0
};

const NotificationContext = createContext<NotificationContextType>(defaultContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [pendingReservationsCount, setPendingReservationsCount] = useState<number>(0);
  const currentYear = new Date().getFullYear().toString();

  // Fetch pending reservations count
  const { data: pendingReservations } = useQuery({
    queryKey: [`/api/admin/reservations/pending/${currentYear}`],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (pendingReservations && Array.isArray(pendingReservations)) {
      setPendingReservationsCount(pendingReservations.length);
    }
  }, [pendingReservations]);

  return (
    <NotificationContext.Provider value={{ pendingReservationsCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);