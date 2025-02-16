// Contoh: app/cashier/layout.tsx
import { NotificationProvider } from "../contexts/NotificationContext";

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <div>{children}</div>
    </NotificationProvider>
  );
}
