"use client";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import Sidebar from "@/components/Sidebar";
import HomeTab from "@/components/tabs/HomeTab";
import CreateEventTab from "@/components/tabs/CreateEventTab";
import BudgetTab from "@/components/tabs/BudgetTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import VendorsTab from "@/components/tabs/VendorsTab";
import AIAssistantTab from "@/components/tabs/AIAssistantTab";

export default function Page() {
  const { loadFromStorage, activeTab } = useAppStore();

  useEffect(() => {
    loadFromStorage();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const load = params.get("load");
      if (load === "demo") {
        useAppStore.getState().loadDemoEvent();
      } else if (load === "synthetic") {
        useAppStore.getState().loadSyntheticEvent();
      } else if (load === "live") {
        useAppStore.getState().loadLiveEvent();
      }

      const tab = params.get("tab");
      if (tab) {
        useAppStore.getState().setActiveTab(tab);
      }
    }
  }, [loadFromStorage]);

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab />;
      case "create":
        return <CreateEventTab />;
      case "budget":
        return <BudgetTab />;
      case "timeline":
        return <TimelineTab />;
      case "vendors":
        return <VendorsTab />;
      case "ai":
        return <AIAssistantTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        id="main-content"
        tabIndex={-1}
      >
        <div className="w-full max-w-[1200px] mx-auto px-4 pt-4 pb-24 md:py-8 sm:px-6 lg:px-8">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}
