import { Link } from "react-router-dom";
import { ArrowLeft, Ghost } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="not-found">
      <span className="not-found-code">404</span>
      <span className="not-found-icon"><Ghost size={26} /></span>
      <h1>This scene doesn&apos;t exist.</h1>
      <p>The page you were looking for has been moved, deleted or never uploaded.</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn--primary"><ArrowLeft size={16} /> Back to home</Link>
        <Link to="/newest" className="btn btn--ghost">Browse the library</Link>
      </div>
    </div>
  );
}
