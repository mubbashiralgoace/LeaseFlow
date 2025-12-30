"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/useUserStore";

export function UserSync() {
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    const syncUser = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return;
      }

      // Only update if user data is different or missing
      const currentUser = useUserStore.getState().user;
      if (!currentUser || currentUser.id !== user.id) {
        setUser({
          id: user.id,
          email: user.email ?? "",
        });
      }
    };

    syncUser();
  }, [setUser]);

  return null;
}

