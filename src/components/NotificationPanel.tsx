import React, { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCircle, Car, CalendarBlank, Warning } from "@phosphor-icons/react";
import { useQuery, useMutation } from "../hooks/useApi";

type Notif = {
  id: string;
  type: "reservation" | "warning" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

function buildNotifications(reservations: any[], cars: any[], insurances: any[]): Notif[] {
  const notifs: Notif[] = [];

  // New pending reservations
  const pending = (reservations ?? []).filter((r) => r.status === "Pending");
  pending.slice(0, 3).forEach((r) => {
    notifs.push({
      id: `res-${r.id}`,
      type: "reservation",
      title: "Rezervim i ri",
      message: `Rezervim i ri në pritje (#${(r.id ?? "").slice(-6)})`,
      time: new Date(r.createdAt).toLocaleDateString("sq-AL"),
      read: false,
    });
  });

  // Expiring insurance
  const today = new Date();
  (insurances ?? []).forEach((ins) => {
    const days = Math.ceil((new Date(ins.expiryDate).getTime() - today.getTime()) / 86400000);
    if (days <= 30 && days >= 0) {
      const car = (cars ?? []).find((c) => c.id === ins.carId);
      notifs.push({
        id: `ins-${ins.id}`,
        type: "warning",
        title: "Sigurim po skadon",
        message: `${car ? `${car.brand} ${car.model}` : "Makinë"} — skadon pas ${days} ditësh`,
        time: new Date(ins.expiryDate).toLocaleDateString("sq-AL"),
        read: false,
      });
    }
  });

  // Cars in maintenance
  const maintenance = (cars ?? []).filter((c) => c.status === "Në mirëmbajtje");
  maintenance.slice(0, 2).forEach((c) => {
    notifs.push({
      id: `maint-${c.id}`,
      type: "info",
      title: "Në mirëmbajtje",
      message: `${c.brand} ${c.model} është në mirëmbajtje`,
      time: "Tani",
      read: false,
    });
  });

  return notifs.slice(0, 10);
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const { data: reservations } = useQuery("Reservation", { orderBy: { createdAt: "desc" }, limit: 20 });
  const { data: cars } = useQuery("Car");
  const { data: insurances } = useQuery("InsuranceRecord");

  const notifs = buildNotifications(reservations ?? [], cars ?? [], insurances ?? []);
  const unread = notifs.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    setReadIds(new Set(notifs.map((n) => n.id)));
  };

  const typeIcon = (type: Notif["type"]) => {
    if (type === "reservation") return <CalendarBlank size={16} weight="fill" className="text-primary" />;
    if (type === "warning") return <Warning size={16} weight="fill" className="text-warning" />;
    return <Car size={16} weight="fill" className="text-neutral-400" />;
  };

  const typeBg = (type: Notif["type"]) => {
    if (type === "reservation") return "bg-primary/10";
    if (type === "warning") return "bg-warning/10";
    return "bg-neutral-100";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-neutral-600 hover:bg-secondary transition-colors duration-200 cursor-pointer"
        aria-label="Njoftimet"
      >
        <Bell size={20} weight="regular" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-neutral-900">Njoftimet</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline cursor-pointer bg-transparent border-0">
                  Shëno të gjitha si të lexuara
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 cursor-pointer border-0 bg-transparent">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                <CheckCircle size={32} weight="light" className="mb-2" />
                <p className="text-sm">Asnjë njoftim</p>
              </div>
            ) : (
              notifs.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-neutral-50 ${!isRead ? "bg-primary/5" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeBg(n.type)}`}>
                      {typeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold text-neutral-900 ${!isRead ? "font-bold" : ""}`}>{n.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">{n.time}</p>
                    </div>
                    {!isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
