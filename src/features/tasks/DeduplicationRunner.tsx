"use client";

import { useEffect, useRef } from "react";
import { cleanupDuplicates } from "./actions";
import { useRouter } from "next/navigation";

export function DeduplicationRunner() {
  const router = useRouter();
  const runOnce = useRef(false);

  useEffect(() => {
    if (!runOnce.current) {
      runOnce.current = true;
      cleanupDuplicates().then((res) => {
        if (res.success) {
          router.refresh();
        }
      });
    }
  }, [router]);

  return null;
}
