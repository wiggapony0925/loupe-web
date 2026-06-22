import { useEffect } from "react";
import { useAnnouncement } from "@loupe/core";
import { useNoticeStore } from "@/stores/noticeStore";

/** Stable id prefix so a dismissed announcement only re-appears when the
 *  message itself changes. */
const ID_PREFIX = "announcement:";

/**
 * Renders the admin's global announcement through the shared notice `<Banner/>`.
 * Side-effect only (returns null): polls `/announcement` and, when enabled,
 * pushes the message into the notice store so every user sees the same banner.
 */
export function AnnouncementHost() {
  const { data } = useAnnouncement();
  const push = useNoticeStore((s) => s.push);

  useEffect(() => {
    if (!data?.enabled || !data.message.trim()) return;
    push({
      id: ID_PREFIX + data.message,
      tone: data.tone,
      message: data.message,
      dismissible: true,
    });
  }, [data, push]);

  return null;
}
