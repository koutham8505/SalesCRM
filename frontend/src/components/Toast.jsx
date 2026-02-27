// D:\SalesCRM\frontend\src\components\Toast.jsx
import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onClose, 3500);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    const bg =
        type === "error" ? "#d32f2f" : type === "warning" ? "#ed6c02" : "#2e7d32";

    return (
        <div
            style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                background: bg,
                color: "#fff",
                padding: "12px 24px",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                zIndex: 9999,
                fontSize: 14,
                maxWidth: 360,
                animation: "slideUp 0.3s ease",
            }}
        >
            {message}
        </div>
    );
}
