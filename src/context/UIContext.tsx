import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AuthModalReason = "login" | "locked" | "inactive" | "upgrade" | "admin" | "account";

interface Toast {
  id: number;
  message: string;
  tone: "default" | "success" | "error";
}

interface UIContextValue {
  authModalOpen: boolean;
  authModalReason: AuthModalReason;
  openAuthModal: (reason?: AuthModalReason) => void;
  closeAuthModal: () => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  toastMessage: Toast | null;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<AuthModalReason>("login");
  const [toastMessage, setToastMessage] = useState<Toast | null>(null);
  const timerRef = useRef<number | null>(null);

  const openAuthModal = useCallback((reason: AuthModalReason = "login") => {
    setAuthModalReason(reason);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const toast = useCallback((message: string, tone: Toast["tone"] = "default") => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const id = Date.now();
    setToastMessage({ id, message, tone });
    timerRef.current = window.setTimeout(() => setToastMessage(null), 4200);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const value = useMemo(
    () => ({
      authModalOpen,
      authModalReason,
      openAuthModal,
      closeAuthModal,
      toast,
      toastMessage,
    }),
    [authModalOpen, authModalReason, openAuthModal, closeAuthModal, toast, toastMessage],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside <UIProvider>.");
  return context;
}
