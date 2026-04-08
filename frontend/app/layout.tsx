import type { Metadata } from "next";
import "./globals.css";
import { CreditProvider } from "@/context/CreditContext";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "CreditMind — Autonomous Credit Intelligence",
  description: "AI-native credit intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-navy-900 text-primary flex">
        <CreditProvider>
          <Sidebar />
          <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6 bg-navy-900">
              {children}
            </main>
          </div>
        </CreditProvider>
      </body>
    </html>
  );
}
