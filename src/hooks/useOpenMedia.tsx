import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { PlayerModal } from "../components/PlayerModal";
import { canAccessLevel } from "../lib/access";
import type { MediaSet } from "../lib/types";

export function useOpenMedia() {
  const { accessLevel, profile } = useAuth();
  const { openAuthModal, toast } = useUI();
  const navigate = useNavigate();
  const [activeSet, setActiveSet] = useState<MediaSet | null>(null);

  function open(set: MediaSet) {
    if (!profile) {
      openAuthModal("locked");
      return;
    }

    // Unreleased titles (2D Games) can be unlocked but not played yet.
    if (set.coming_soon) {
      if (canAccessLevel(accessLevel, set.access_level)) {
        toast("Coming soon — this title unlocks at launch.", "default");
        return;
      }
      openAuthModal(accessLevel === "basic" ? "upgrade" : "purchase");
      return;
    }

    // Showcase posters are marketing previews, not playable library items.
    if (set.is_showcase) {
      if (accessLevel === "full" || (accessLevel === "basic" && set.access_level === "basic")) {
        navigate("/browse");
        return;
      }
      openAuthModal(accessLevel === "basic" ? "upgrade" : "purchase");
      return;
    }

    if (canAccessLevel(accessLevel, set.access_level)) {
      setActiveSet(set);
      return;
    }
    if (accessLevel === "public") {
      openAuthModal("purchase");
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
