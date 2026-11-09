import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useUI } from "../context/UIContext";

export function ToastViewport() {
  const { toastMessage } = useUI();
  if (!toastMessage) return null;

  const Icon =
    toastMessage.tone === "success"
      ? CheckCircle2
      : toastMessage.tone === "error"
        ? XCircle
        : Info;

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      <div className={`toast toast--${toastMessage.tone}`} key={toastMessage.id}>
        <Icon size={17} />
        <span>{toastMessage.message}</span>
      </div>
    </div>
  );
}
