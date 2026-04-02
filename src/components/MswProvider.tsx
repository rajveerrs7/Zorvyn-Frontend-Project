"use client";

import { useEffect } from "react";

export default function MswProvider() {
  useEffect(() => {
    const shouldEnable =
      process.env.NEXT_PUBLIC_MSW === "true" ||
      process.env.NODE_ENV === "development";
    if (!shouldEnable) return;

    const startWorker = async () => {
      const { worker } = await import("@/mocks/browser");
      await worker.start({
        onUnhandledRequest: "bypass",
      });
    };

    startWorker();
  }, []);

  return null;
}
