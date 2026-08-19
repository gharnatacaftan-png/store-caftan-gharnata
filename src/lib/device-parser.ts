import "server-only";

export interface ParsedUA {
  browser: string;
  os: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel: string;
  fullLabel: string;
}

export function parsePhoneModel(ua: string): string {
  if (!ua) return "Smartphone";

  // Extract raw device token from Android User-Agent header (Linux; Android 10; <MODEL>)
  const androidMatch = ua.match(/\(Linux;\s*Android\s*[\d.]+;\s*([^;)]+)/i);
  let raw = androidMatch ? androidMatch[1].trim() : "";
  if (raw.includes(" Build/")) raw = raw.split(" Build/")[0].trim();
  if (raw.includes(";")) raw = raw.split(";")[0].trim();

  // 1. Samsung
  const sm = raw.match(/SM-([A-Z0-9]+)/i) || ua.match(/SM-([A-Z0-9]+)/i);
  if (sm) {
    const code = sm[1].toUpperCase();
    if (code.startsWith("A53")) return "Samsung Galaxy A53";
    if (code.startsWith("A52")) return "Samsung Galaxy A52";
    if (code.startsWith("A51")) return "Samsung Galaxy A51";
    if (code.startsWith("A32")) return "Samsung Galaxy A32";
    if (code.startsWith("A12")) return "Samsung Galaxy A12";
    if (code.startsWith("A13")) return "Samsung Galaxy A13";
    if (code.startsWith("A14")) return "Samsung Galaxy A14";
    if (code.startsWith("A33")) return "Samsung Galaxy A33";
    if (code.startsWith("A34")) return "Samsung Galaxy A34";
    if (code.startsWith("A54")) return "Samsung Galaxy A54";
    if (code.startsWith("A55")) return "Samsung Galaxy A55";
    if (code.startsWith("S918") || code.startsWith("S928")) return "Samsung Galaxy S23/S24 Ultra";
    if (code.startsWith("S90")) return "Samsung Galaxy S22";
    if (code.startsWith("S91")) return "Samsung Galaxy S23";
    if (code.startsWith("S92")) return "Samsung Galaxy S24";
    return `Samsung Galaxy (SM-${code})`;
  }

  // 2. Oppo
  const cph = raw.match(/(CPH[\d]+|P[A-Z0-9]{4,})/i) || ua.match(/OPPO[ _-]?([A-Za-z0-9 _-]+)/i);
  if (cph) {
    const code = (cph[1] || "").toUpperCase();
    if (code.includes("2581") || code.includes("2587") || code.includes("2589")) return "Oppo Reno 11";
    if (code.includes("2211") || code.includes("2145")) return "Oppo Reno 5";
    if (code.includes("2371") || code.includes("2407")) return "Oppo Reno 8";
    if (code.includes("2525") || code.includes("2523")) return "Oppo Reno 10";
    if (code.includes("2015") || code.includes("2083")) return "Oppo A31";
    if (code.includes("2179") || code.includes("2269")) return "Oppo A16";
    if (code.includes("2387") || code.includes("2477")) return "Oppo A57";
    if (code.includes("2579")) return "Oppo A78";
    return `Oppo (${code || raw})`;
  }

  // 3. Xiaomi / Redmi / Poco
  const mi = raw.match(/^(M\d{7}[A-Z]+|\d{7,8}[A-Z]+)$/i) || ua.match(/(Xiaomi|Redmi|POCO)[ _-]?([A-Za-z0-9 _-]+)/i);
  if (mi) {
    const code = (mi[2] || mi[1] || raw).trim();
    return `Xiaomi / Redmi (${code})`;
  }

  // 4. Realme
  const rmx = raw.match(/(RMX[\d]+)/i) || ua.match(/Realme[ _-]?([A-Za-z0-9 _-]+)/i);
  if (rmx) {
    return `Realme (${rmx[1]})`;
  }

  // 5. Vivo
  const vivo = raw.match(/(V\d{4}[A-Z]*)/i) || ua.match(/Vivo[ _-]?([A-Za-z0-9 _-]+)/i);
  if (vivo) {
    return `Vivo (${vivo[1]})`;
  }

  // 6. Huawei / Honor
  const huawei = ua.match(/(HUAWEI|HONOR)[ _-]?([A-Za-z0-9 _-]+)/i);
  if (huawei) {
    return `${huawei[1]} ${huawei[2]?.trim().split(" ")[0] || ""}`.trim();
  }

  // 7. Google Pixel
  const pixel = raw.match(/(Pixel[\w\s]+)/i);
  if (pixel) {
    return `Google ${pixel[1].trim()}`;
  }

  // 8. iPhone / iPad
  if (/iPhone/i.test(ua)) return "Apple iPhone";
  if (/iPad/i.test(ua)) return "Apple iPad";

  // 9. General fallback with raw Android model token if valid
  if (raw && raw !== "K" && raw !== "Build" && raw.length > 2 && raw.length < 30) {
    return `Android (${raw})`;
  }

  return "Smartphone Android";
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
    deviceModel = "Apple iPad";
  } else if (/iPhone/i.test(ua)) {
    deviceType = "Mobile";
    deviceModel = "Apple iPhone";
  } else if (/Android/i.test(ua) || /Mobile/i.test(ua)) {
    deviceType = "Mobile";
    if (/Tablet|Android.+Mobile|Android.+touch/i.test(ua) && !/Mobile/i.test(ua)) {
      deviceType = "Tablet";
    }
    deviceModel = parsePhoneModel(ua);
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
