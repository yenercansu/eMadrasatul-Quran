import React from "react";
import { FullScreenShell } from "@/components/DesignSystem";

interface FullScreenPageProps {
  title: string;
  onClose: () => void;
  /** Wrap children in a ScrollView (default true). Pass false when the screen manages its own scroll. */
  scrollable?: boolean;
  children: React.ReactNode;
}

export function FullScreenPage({
  title,
  onClose,
  scrollable = true,
  children,
}: FullScreenPageProps) {
  return (
    <FullScreenShell title={title} onClose={onClose} scrollable={scrollable}>
      {children}
    </FullScreenShell>
  );
}
