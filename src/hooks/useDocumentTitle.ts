import { useEffect } from "react";
import { BRAND_NAME, BRAND_TITLE } from "../lib/config";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BRAND_NAME}` : BRAND_TITLE;
  }, [title]);
}
