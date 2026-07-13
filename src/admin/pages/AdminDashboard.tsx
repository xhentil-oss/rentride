import React from "react";
import { Link } from "react-router-dom";
import {
  Car,
  Users,
  CalendarBlank,
  ChartBar,
  ArrowRight,
  Warning,
} from "@phosphor-icons/react";
import { useQuery } from "../../hooks/useApi";
import { useCountUp } from "../../hooks/useCountUp";
import StatusBadge from "../../components/StatusBadge";

function KpiCard({
  title,
  value,
  suffix,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  color: string;
}) {
  const count = useCountUp(value);
  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-500">{title}</p>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} weight="regular" className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-semibold text-neutral-900">
        {suffix === "€" ? `€${count.toLocaleString()}` : `${count}${suffix || ""}`}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  // ALL hooks must be at the top — never below a conditional return
  const { data: cars, isPending: carsLoading } = useQuery("Car");
  const { data: reservations, isPending: resLoading } = useQuery("Reservation");
  const { data: customers } = useQuery("Customer");

  const isLoading = carsLoading || resLoading;

  const totalRevenue = (reservations ?? [])
    .filter((r) => r.status !== "Cancelled")
    .reduce((s, r) => s + Number(r.totalPrice || 0), 0);

  const activeRes = (reservations ?? []).filter(
    (r) => r.status === "Active" || r.status === "Confirmed",
  ).length;

  const occupancyRate =
    (cars ?? []).length > 0
      ? Math.round(
          ((cars ?? []).filter((c) => c.status === "I rezervuar").length /
            (cars ?? []).length) *
            100,
        )
      : 0;

  const recentReservations = (reservations ?? []).slice(0, 5);
  const pendingAlerts = (reservations ?? []).filter((r) => r.status === "Pending");

  // Resolve names from IDs
  const getCustomerName = (id: string) => {
    const c = (customers ?? []).find((x) => x.id === id);
    if (!c) return (id ?? "").slice(0, 10) + "…";
    return c.name || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email;
  };

  const getCarName = (id: string) => {
    const c = (cars ?? []).find((x) => x.id === id);
    return c ? `${c.brand} ${c.model}` : (id ?? "").slice(0, 10) + "…";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">Duke ngarkuar të dhënat...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-border p-6 animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-neutral-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">Mirë se vini në panelin e administrimit</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Makina totale" value={(cars ?? []).length} icon={Car} color="bg-primary" />
        <KpiCard title="Rezervime aktive" value={activeRes} icon={CalendarBlank} color="bg-info" />
        <KpiCard title="Të ardhura" value={totalRevenue} suffix="€" icon={ChartBar} color="bg-success" />
        <KpiCard title="Shkalla e zënies" value={occupancyRate} suffix="%" icon={Users} color="bg-warning" />
      </div>

      {pendingAlerts.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Warning size={18} weight="regular" className="text-warning-foreground" />
            <p className="text-sm font-medium text-warning-foreground">
              {pendingAlerts.length} rezervime në pritje konfirmimi
            </p>
          </div>
          <Link to="/admin/rezervime" className="text-xs text-primary hover:underline no-underline">
            Shiko rezervimet →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-neutral-900">Rezervimet e fundit</h2>
            <Link
              to="/admin/rezervime"
              className="text-xs text-primary hover:underline no-underline flex items-center gap-1"
            >
              Shiko të gjitha <ArrowRight size={12} weight="regular" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentReservations.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">Nuk ka rezervime ende.</p>
            )}
            {recentReservations.map((res) => (
              <div
                key={res.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {getCustomerName(res.customerId)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {getCarName(res.carId)} ·{" "}
                    {new Date(res.startDate).toLocaleDateString("sq-AL")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-800">€{res.totalPrice}</span>
                  <StatusBadge status={res.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-neutral-900">Statusi i flotës</h2>
            <Link
              to="/admin/flota"
              className="text-xs text-primary hover:underline no-underline flex items-center gap-1"
            >
              Menaxho <ArrowRight size={12} weight="regular" />
            </Link>
          </div>
          <div className="space-y-3">
            {(cars ?? []).length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-4">Nuk ka makina të shtuara ende.</p>
            )}
            {(cars ?? []).slice(0, 6).map((car) => (
              <div
                key={car.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {car.brand} {car.model}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {car.category} · €{car.pricePerDay}/ditë
                  </p>
                </div>
                <StatusBadge status={car.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
