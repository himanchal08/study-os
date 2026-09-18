"use client";

import { useTransition, useState } from "react";
import { deleteTopicRevisions } from "@/app/(dashboard)/revisions/actions";

export function DeleteTopicRevisionsButton({ topicId, topicName }: { topicId: string; topicName: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const handleClick = () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    startTransition(async () => {
      await deleteTopicRevisions(topicId);
    });
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      title={confirm ? `Confirm: delete all revisions for "${topicName}"` : `Delete all revisions for "${topicName}"`}
      className="opacity-0 group-hover:opacity-100 transition-all text-[10px] px-1.5 py-0.5 rounded disabled:opacity-40"
      style={{
        color: confirm ? "#ef4444" : "#525252",
        border: `1px solid ${confirm ? "#ef444440" : "#2a2a2a"}`,
        background: confirm ? "#ef444410" : "transparent",
      }}
    >
      {isPending ? "…" : confirm ? "Confirm delete" : "Delete all"}
    </button>
  );
}
