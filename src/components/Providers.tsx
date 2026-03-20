"use client";

// Client-side provider wrapper used by the (server) root layout.
// Add any future providers (analytics, theme, etc.) here.

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="bottom-center"
        gutter={8}
        toastOptions={{
          duration: 2800,
          style: {
            background: "#1a1a24",
            color: "#c8b8a2",
            border: "1px solid rgba(100, 95, 85, 0.35)",
            borderRadius: "12px",
            fontSize: "13px",
            fontFamily: "var(--font-geist-sans, sans-serif)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            padding: "10px 14px",
          },
          success: {
            iconTheme: {
              primary: "#d4af37",
              secondary: "#1a1a24",
            },
          },
          error: {
            iconTheme: {
              primary: "#e8334a",
              secondary: "#1a1a24",
            },
          },
        }}
      />
    </AuthProvider>
  );
}
