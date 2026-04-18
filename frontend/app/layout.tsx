import type { Metadata } from "next";
import "./globals.css";
import { CreditProvider } from "@/context/CreditContext";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ParticleBackground from "@/components/ui/ParticleBackground";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "CreditMind — Autonomous Credit Intelligence",
  description: "AI-native credit intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full text-primary flex">
        <CreditProvider>
          <ParticleBackground />
          <Sidebar />
          <div className="flex flex-col flex-1 min-h-screen overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </CreditProvider>
      </body>
    </html>
  );
}
