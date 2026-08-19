import "server-only";

export interface ParsedUA {
  browser: string;
  os: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel: string;
  fullLabel: string;
}

export function parseUserAgent(ua: string): ParsedUA {
  if (!ua) {
    return {
      browser: "Unknown Browser",
      os: "Unknown OS",
      deviceType: "Desktop",
      deviceModel: "Unknown Device",
      fullLabel: "Unknown Device",
    };
  }

  // --- 1. Browser & App Detection ---
  let browser = "Browser";
  if (/FBAN|FBAV/i.test(ua)) browser = "Facebook App";
  else if (/Instagram/i.test(ua)) browser = "Instagram App";
  else if (/TikTok/i.test(ua)) browser = "TikTok App";
  else if (/Telegram/i.test(ua)) browser = "Telegram App";
  else if (/Edg\/([\d.]+)/i.test(ua)) {
    const v = ua.match(/Edg\/([\d.]+)/i)?.[1]?.split(".")[0];
    browser = `Edge${v ? " " + v : ""}`;
  } else if (/SamsungBrowser\/([\d.]+)/i.test(ua)) {
    const v = ua.match(/SamsungBrowser\/([\d.]+)/i)?.[1]?.split(".")[0];
    browser = `Samsung Internet${v ? " " + v : ""}`;
  } else if (/OPR\/([\d.]+)|Opera/i.test(ua)) {
    const v = ua.match(/OPR\/([\d.]+)/i)?.[1]?.split(".")[0];
    browser = `Opera${v ? " " + v : ""}`;
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    const v = ua.match(/Firefox\/([\d.]+)/i)?.[1]?.split(".")[0];
    browser = `Firefox${v ? " " + v : ""}`;
  } else if (/Chrome\/([\d.]+)/i.test(ua)) {
    const v = ua.match(/Chrome\/([\d.]+)/i)?.[1]?.split(".")[0];
    browser = `Chrome${v ? " " + v : ""}`;
  } else if (/Version\/([\d.]+).*Safari/i.test(ua)) {
    const v = ua.match(/Version\/([\d.]+)/i)?.[1]?.split(".")[0];
    browser = `Safari${v ? " " + v : ""}`;
  } else if (/Safari/i.test(ua)) {
    browser = "Safari";
  }

  // --- 2. Operating System Detection ---
  let os = "OS";
  if (/Windows NT 10\.0/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/i.test(ua)) os = "Windows 7";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone OS ([\d_]+)/i.test(ua)) {
    const v = ua.match(/iPhone OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".");
    os = `iOS${v ? " " + v.split(".")[0] : ""}`;
  } else if (/Mac OS X ([\d_]+)/i.test(ua)) {
    const v = ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replace(/_/g, ".");
    os = `macOS${v ? " " + v.split(".")[0] : ""}`;
  } else if (/Android ([\d.]+)/i.test(ua)) {
    const v = ua.match(/Android ([\d.]+)/i)?.[1]?.split(".")[0];
    os = `Android${v ? " " + v : ""}`;
  } else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  // --- 3. Device Type & Model ---
  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  let deviceModel = "Desktop PC";

  if (/iPad/i.test(ua)) {
    deviceType = "Tablet";
    deviceModel = "iPad";
  } else if (/iPhone/i.test(ua)) {
    deviceType = "Mobile";
    deviceModel = "iPhone";
  } else if (/Android/i.test(ua) || /Mobile/i.test(ua)) {
    deviceType = "Mobile";
    if (/Tablet|Android.+Mobile|Android.+touch/i.test(ua) && !/Mobile/i.test(ua)) {
      deviceType = "Tablet";
    }

    const smMatch = ua.match(/(SM-[A-Za-z0-9]+)/i);
    const oppoMatch = ua.match(/OPPO[ _-]?([A-Za-z0-9 _-]+)/i);
    const xiaomiMatch = ua.match(/(Xiaomi|Redmi|POCO)[ _-]?([A-Za-z0-9 _-]+)/i);
    const realmeMatch = ua.match(/Realme[ _-]?([A-Za-z0-9 _-]+)/i);
    const vivoMatch = ua.match(/Vivo[ _-]?([A-Za-z0-9 _-]+)/i);
    const huaweiMatch = ua.match(/(HUAWEI|HONOR)[ _-]?([A-Za-z0-9 _-]+)/i);

    if (smMatch) deviceModel = `Samsung ${smMatch[1]}`;
    else if (oppoMatch) deviceModel = `Oppo ${oppoMatch[1].trim().split(" ")[0]}`;
    else if (xiaomiMatch) deviceModel = `${xiaomiMatch[1]} ${xiaomiMatch[2]?.trim().split(" ")[0] || ""}`.trim();
    else if (realmeMatch) deviceModel = `Realme ${realmeMatch[1].trim().split(" ")[0]}`;
    else if (vivoMatch) deviceModel = `Vivo ${vivoMatch[1].trim().split(" ")[0]}`;
    else if (huaweiMatch) deviceModel = `${huaweiMatch[1]} ${huaweiMatch[2]?.trim().split(" ")[0] || ""}`.trim();
    else deviceModel = "Smartphone";
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    deviceModel = "Mac Computer";
  }

  const fullLabel = `${browser} · ${deviceModel} (${os})`;

  return { browser, os, deviceType, deviceModel, fullLabel };
}

// IP Geolocation Lookup — uses ipwho.is (Free HTTPS API, fast JSON response)
export async function lookupIpLocation(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: "Localhost", city: "Local Dev" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      cache: "force-cache",
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          country: data.country || null,
          city: data.city || data.region || null,
        };
      }
    }
  } catch (err) {
    console.warn("[lookupIpLocation] Geolocation lookup failed for IP:", ip, err);
  }

  return { country: null, city: null };
}
