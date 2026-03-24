import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useDocumentHead(title, description) {
  useEffect(() => {
    if (title) document.title = `${title} | SmartEn`;
    else document.title = "SmartEn — Konkurs angielski";
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute("content", description);
  }, [title, description]);
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
