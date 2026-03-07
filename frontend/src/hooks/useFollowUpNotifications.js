// D:\SalesCRM\frontend\src\hooks\useFollowUpNotifications.js
// Browser Push Notification hook — requests permission and fires desktop
// alerts whenever a lead's next_follow_up is TODAY and not yet dismissed.

import { useEffect, useRef } from "react";

const STORAGE_KEY = "crm_notified_today"; // localStorage key

function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
}

function getNotifiedSet() {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        // Clear if date changed (new day)
        if (stored.date !== getTodayStr()) return new Set();
        return new Set(stored.ids || []);
    } catch { return new Set(); }
}

function saveNotifiedSet(set) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayStr(), ids: [...set] }));
}

export function useFollowUpNotifications(leads, onNavigate) {
    const permissionRef = useRef(Notification.permission);
    const intervalRef = useRef(null);

    // Request permission once on mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(p => { permissionRef.current = p; });
        }
    }, []);

    const checkAndNotify = (leadList) => {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        const today = getTodayStr();
        const notified = getNotifiedSet();
        const FINAL = ["Won", "Lost"];
        let changed = false;

        leadList.forEach(lead => {
            if (!lead.next_follow_up) return;
            if (FINAL.includes(lead.stage)) return;
            const dueDate = lead.next_follow_up.slice(0, 10);
            if (dueDate !== today) return;            // only today
            if (notified.has(lead.id)) return;        // already notified

            // Fire notification
            const title = "📅 Follow-up Due Today";
            const body = `${lead.lead_name || "A lead"} — ${lead.institution_name || ""}\n${lead.phone || ""}`;
            const n = new Notification(title, {
                body,
                icon: "/favicon.ico",
                tag: `followup-${lead.id}`,            // prevents duplicates per lead
                requireInteraction: false,
            });

            n.onclick = () => {
                window.focus();
                onNavigate?.("leads");
                n.close();
            };

            notified.add(lead.id);
            changed = true;
        });

        if (changed) saveNotifiedSet(notified);
    };

    // Run on every leads update + every 30 min
    useEffect(() => {
        if (!leads || leads.length === 0) return;
        checkAndNotify(leads);

        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => checkAndNotify(leads), 30 * 60 * 1000);
        return () => clearInterval(intervalRef.current);
    }, [leads]);
}
