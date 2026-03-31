import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BlockedItem {
  id: number | string;
  name: string;
  type: string;
  action: string;
  message?: string;
  timestamp: string;
}

export function useBlockedContent() {
  const [blockedContent, setBlockedContent] = useState<BlockedItem[]>([]);
  const [blockedCategories, setBlockedCategories] = useState<BlockedItem[]>([]);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["blocked_content", "blocked_categories"]);

    if (data) {
      for (const row of data) {
        const val = Array.isArray(row.value) ? row.value : [];
        if (row.key === "blocked_content") setBlockedContent(val as BlockedItem[]);
        if (row.key === "blocked_categories") setBlockedCategories(val as BlockedItem[]);
      }
    }
  }, []);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel("blocked-content-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "app_settings",
      }, (payload) => {
        const key = (payload.new as any)?.key;
        if (key === "blocked_content" || key === "blocked_categories") {
          fetch();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const isContentBlocked = useCallback((id: number, type: string) => {
    return blockedContent.some((b) => b.id === id && b.type === type);
  }, [blockedContent]);

  const isCategoryBlocked = useCallback((categoryId: string, type: string) => {
    return blockedCategories.some((b) => String(b.id) === String(categoryId) && b.type === type);
  }, [blockedCategories]);

  const getCategoryAction = useCallback((categoryId: string, type: string) => {
    return blockedCategories.find((b) => String(b.id) === String(categoryId) && b.type === type);
  }, [blockedCategories]);

  return { blockedContent, blockedCategories, isContentBlocked, isCategoryBlocked, getCategoryAction };
}
