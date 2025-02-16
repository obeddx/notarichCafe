// contexts/NotificationContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface MyNotification {
  message: string;
  date: string;
}

interface NotificationContextType {
  notifications: MyNotification[];
  setNotifications: (notifications: MyNotification[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<MyNotification[]>([]);

  // Muat notifikasi dari localStorage saat provider di-mount
  useEffect(() => {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      setNotifications(JSON.parse(stored));
    }
  }, []);

  // Simpan notifikasi ke localStorage setiap kali notifications berubah
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
