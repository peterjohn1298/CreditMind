"use client";

import { usePathname } from "next/navigation";
import PageTransition from "./PageTransition";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const bare = path === "/" || path === "/home";

  return (
    <main
      className="flex-1 overflow-y-auto"
      style={bare ? {} : { padding: "24px 24px 112px" }}
    >
      <PageTransition>{children}</PageTransition>
    </main>
  );
}
