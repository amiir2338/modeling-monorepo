import type { ReactNode } from "react";
import SidebarClient from "@/app/client/dashboard/client/SidebarClient";
// Use the simpler client topbar (no props) to satisfy layout usage
import TopbarClient from "@/app/client/dashboard/client/TopbarClient";

export default function ClientLayout({ children }: { children: ReactNode }) {
  console.log("[ClientLayout] active");
  return (
    <div className="min-h-dvh grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[auto_1fr] md:grid-rows-1">
      <aside className="border-r bg-white hidden md:block">
        <SidebarClient />
      </aside>
      <div className="flex flex-col">
        <header className="bg-yellow-50 border-b-4 border-yellow-400 sticky top-0 z-10">
          {/* نوار زرد ضخیم برای اطمینان از اعمال layout */}
          <TopbarClient />
        </header>
        <main className="p-4 md:p-6 bg-gray-50 flex-1">{children}</main>
      </div>
    </div>
  );
}

