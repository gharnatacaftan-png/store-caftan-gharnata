"use client";

import { useState, useEffect } from "react";
import type { SiteSettings } from "@/lib/settings";

export function useSettings() {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                }
            } catch (e) {
                console.error("Failed to fetch settings:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    return { settings, loading };
}