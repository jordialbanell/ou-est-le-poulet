import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type ToastType = "success" | "error" | "info";
type ShowToast = (message: string, type?: ToastType) => void;

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<ShowToast>(() => {});

/** Bottom-centre snackbar. Call `const toast = useToast()` then `toast(msg, "error")`. */
export function useToast(): ShowToast {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback<ShowToast>((message, type = "info") => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, type }]);
    // Matches the 3s CSS fade-out, then drop from the DOM.
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-toast pointer-events-auto flex max-w-[90vw] items-center gap-2 rounded-full bg-[#1a1410] px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-black/30"
          >
            {t.type === "error" && <span>⚠️</span>}
            <span className="truncate">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
