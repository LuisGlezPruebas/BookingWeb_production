import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import Header from "@/components/layout/header";
import AdminDashboard from "@/components/admin/dashboard";
import AdminReservations from "@/components/admin/reservations";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { userType, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated || userType !== "admin") {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, userType, setLocation]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (!isAuthenticated || userType !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header userType="admin" activeTab={activeTab} onTabChange={handleTabChange} />
      
      {activeTab === "dashboard" ? (
        <AdminDashboard />
      ) : (
        <AdminReservations />
      )}
    </div>
  );
}
