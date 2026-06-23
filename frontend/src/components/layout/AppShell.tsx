import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 py-6">{children}</main>
      <Footer />
    </div>
  );
}
