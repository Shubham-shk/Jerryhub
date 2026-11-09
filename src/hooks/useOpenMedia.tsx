import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { PlayerModal } from "../components/PlayerModal";
import { canAccessLevel } from "../lib/access";
import type { MediaSet } from "../lib/types";

export function useOpenMedia() {
  const { accessLevel, profile } = useAuth();
  const { openAuthModal } = useUI();
  const [activeSet, setActiveSet] = useState<MediaSet | null>(null);

  function open(set: MediaSet) {
    if (!profile) {
      openAuthModal("locked");
      return;
    }
    if (canAccessLevel(accessLevel, set.access_level)) {
      setActiveSet(set);
      return;
    }
    if (accessLevel === "public") {
      openAuthModal("inactive");
      return;
    }
    openAuthModal("upgrade");
  }

  return {
    activeSet,
    open,
    close: () => setActiveSet(null),
    player: <PlayerModal set={activeSet} onClose={() => setActiveSet(null)} />,
  };
}
