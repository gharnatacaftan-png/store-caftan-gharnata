"use client";

import { AdminErrorBoundary } from "@/components/AdminErrorBoundary";

export default function AdminErrorWrapper({ children }: { children: React.ReactNode }) {
  return <AdminErrorBoundary>{children}</AdminErrorBoundary>;
}
