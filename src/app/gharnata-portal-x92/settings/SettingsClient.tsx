"use client";
import { useState, useTransition } from "react";
import { Phone, MessageCircle, Share2, MapPin, Save, Lock, Eye, EyeOff, Send, Trash2, Bell, Plus } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";
import RefreshButton from "@/components/admin/RefreshButton";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { changePasswordAction } from "../actions";
import { parseTelegramChatIds } from "@/lib/telegram-utils";

async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf");
  const data = await res.json();
  return data.csrfToken;
}

// Gold on/off switch controlling whether a setting appears in the storefront
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${on ? "bg-[#D4AF37]" : "bg-white/10"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function SettingsClient({ initialSettings }: { initialSettings: SiteSettings }) {
  const { lang, dir } = useLang();
  const tx = t(lang);
  const [phone1, setPhone1] = useState(initialSettings.phone1);
  const [phone2, setPhone2] = useState(initialSettings.phone2);
  const [phone3, setPhone3] = useState(initialSettings.phone3 ?? "");
  const [phone1Enabled, setPhone1Enabled] = useState(initialSettings.phone1_enabled ?? true);
  const [phone2Enabled, setPhone2Enabled] = useState(initialSettings.phone2_enabled ?? true);
  const [phone3Enabled, setPhone3Enabled] = useState(initialSettings.phone3_enabled ?? true);
  const [whatsapp, setWhatsapp] = useState(initialSettings.whatsapp);
  const [instagram, setInstagram] = useState(initialSettings.instagram);
  const [facebook, setFacebook] = useState(initialSettings.facebook ?? "");
  const [tiktok, setTiktok] = useState(initialSettings.tiktok ?? "");
  const [xLink, setXLink] = useState(initialSettings.x_link ?? "");
  const [instagramEnabled, setInstagramEnabled] = useState(initialSettings.instagram_enabled ?? true);
  const [facebookEnabled, setFacebookEnabled] = useState(initialSettings.facebook_enabled ?? true);
  const [tiktokEnabled, setTiktokEnabled] = useState(initialSettings.tiktok_enabled ?? true);
  const [xEnabled, setXEnabled] = useState(initialSettings.x_enabled ?? true);

  // Telegram Notifications — le token du bot vient du serveur (jamais encodé
  // en dur dans le bundle client) et n'est pas modifiable. Seul le chat_id qui
  // reçoit les messages peut être changé.
  const TELEGRAM_BOT_TOKEN = initialSettings.telegram_bot_token || "";
  const [telegramEnabled, setTelegramEnabled] = useState(initialSettings.telegram_enabled ?? true);
  const [telegramChatId, setTelegramChatId] = useState(initialSettings.telegram_chat_id ?? "");
  const [ntfyEnabled, setNtfyEnabled] = useState(initialSettings.ntfy_enabled ?? false);
  const [ntfyTopic, setNtfyTopic] = useState(initialSettings.ntfy_topic ?? "");
  const [testingNtfy, setTestingNtfy] = useState(false);
  const [ntfyResult, setNtfyResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  // Store addresses: up to 4 slots, each with its own map link.
  const [addresses, setAddresses] = useState([
    { text: initialSettings.address1 ?? "", url: initialSettings.address1_url ?? "", enabled: initialSettings.address1_enabled ?? true },
    { text: initialSettings.address2 ?? "", url: initialSettings.address2_url ?? "", enabled: initialSettings.address2_enabled ?? true },
    { text: initialSettings.address3 ?? "", url: initialSettings.address3_url ?? "", enabled: initialSettings.address3_enabled ?? true },
    { text: initialSettings.address4 ?? "", url: initialSettings.address4_url ?? "", enabled: initialSettings.address4_enabled ?? true },
  ]);
  const [visibleAddresses, setVisibleAddresses] = useState(() =>
    Math.max(1, [initialSettings.address1, initialSettings.address2, initialSettings.address3, initialSettings.address4]
      .filter(v => (v ?? "").trim()).length));

  const patchAddress = (i: number, patch: Partial<{ text: string; url: string; enabled: boolean }>) =>
    setAddresses(list => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const removeAddress = (i: number) => {
    setAddresses(list => list.map((a, j) => (j === i ? { text: "", url: "", enabled: false } : a)));
    if (visibleAddresses > 1) {
      setVisibleAddresses(v => Math.max(1, v - 1));
    }
  };

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Change-password state
  const [isChanging, startChangeTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwDone, setPwDone] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleTestTelegram() {
    setTestingTelegram(true);
    setTestResult(null);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/admin/test-telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          chatId: telegramChatId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({ ok: true });
      } else {
        setTestResult({ error: data.error || "فشل إرسال الإشعار التجريبي" });
      }
    } catch {
      setTestResult({ error: "تعذر الاتصال بالخادم" });
    } finally {
      setTestingTelegram(false);
    }
  }

  async function handleTestNtfy() {
    setTestingNtfy(true);
    setNtfyResult(null);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/admin/test-ntfy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ topic: ntfyTopic }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNtfyResult({ ok: true });
      } else {
        setNtfyResult({ error: data.error || "فشل إرسال اختبار ntfy" });
      }
    } catch {
      setNtfyResult({ error: "تعذر الاتصال بالخادم" });
    } finally {
      setTestingNtfy(false);
    }
  }

  async function handleChangePassword() {
    setPwError("");
    setPwDone(false);
    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);
    startChangeTransition(async () => {
      try {
        const result = await changePasswordAction(formData);
        if (result?.error) {
          setPwError(result.error);
          return;
        }
        if (result?.ok) {
          setPwDone(true);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setTimeout(() => setPwDone(false), 4000);
        }
      } catch (err) {
        console.error("[changePassword] unexpected error:", err);
        setPwError(tx.admin("password_update_failed"));
      }
    });
  }

  async function handleSave() {
    setSaving(true);
    const csrfToken = await getCsrfToken();
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        phone1, phone2, phone3, whatsapp, instagram,
        phone1_enabled: phone1Enabled,
        phone2_enabled: phone2Enabled,
        phone3_enabled: phone3Enabled,
        facebook, tiktok, x_link: xLink,
        instagram_enabled: instagramEnabled,
        facebook_enabled: facebookEnabled,
        tiktok_enabled: tiktokEnabled,
        x_enabled: xEnabled,
        address1: addresses[0].text, address1_url: addresses[0].url, address1_enabled: addresses[0].enabled,
        address2: addresses[1].text, address2_url: addresses[1].url, address2_enabled: addresses[1].enabled,
        address3: addresses[2].text, address3_url: addresses[2].url, address3_enabled: addresses[2].enabled,
        address4: addresses[3].text, address4_url: addresses[3].url, address4_enabled: addresses[3].enabled,
        telegram_enabled: telegramEnabled,
        telegram_chat_id: telegramChatId,
        ntfy_topic: ntfyTopic,
        ntfy_enabled: ntfyEnabled,
      }),
    });
    setSaving(false);

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="p-6 lg:p-10" dir={dir}>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{tx.admin("settings_title")}</h1>
          <p className="text-gray-500 mt-1">{tx.admin("settings_subtitle")}</p>
        </div>
        <RefreshButton />
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Phone Numbers */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#D4AF37]" />
            {tx.admin("phone_numbers")}
          </h2>
          <div className="space-y-4">
            {[
              { label: tx.admin("phone1"), value: phone1, set: setPhone1, enabled: phone1Enabled, setEnabled: setPhone1Enabled },
              { label: tx.admin("phone2"), value: phone2, set: setPhone2, enabled: phone2Enabled, setEnabled: setPhone2Enabled },
              { label: tx.admin("phone3"), value: phone3, set: setPhone3, enabled: phone3Enabled, setEnabled: setPhone3Enabled },
            ].map(item => (
              <div key={item.label} className="border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-white text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">{tx.admin("show_on_site")}</span>
                    <Toggle on={item.enabled} onChange={item.setEnabled} label={item.label} />
                  </div>
                </div>
                <input value={item.value} onChange={e => item.set(e.target.value)} disabled={!item.enabled}
                  className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-40 ${item.enabled ? "" : "pointer-events-none"}`}
                  dir="ltr" placeholder="05XXXXXXXX" />
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#D4AF37]" />
            {tx.admin("whatsapp")}
          </h2>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">{tx.admin("whatsapp_label")}</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              dir="ltr" placeholder="21365XXXXXXX" />
            <p className="text-gray-600 text-xs mt-1">{tx.admin("whatsapp_hint")}</p>
          </div>
        </div>

        {/* Social Networks */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#D4AF37]" />
            {tx.admin("social_title")}
          </h2>
          <p className="text-gray-500 text-xs mb-5">{tx.admin("toggle_hint")}</p>

          <div className="space-y-4">
            {[
              {
                key: "instagram", label: tx.admin("instagram"), enabled: instagramEnabled, setEnabled: setInstagramEnabled,
                value: instagram, set: setInstagram, placeholder: tx.admin("instagram_placeholder"),
              },
              {
                key: "facebook", label: tx.admin("facebook"), enabled: facebookEnabled, setEnabled: setFacebookEnabled,
                value: facebook, set: setFacebook, placeholder: tx.admin("link_placeholder"),
              },
              {
                key: "tiktok", label: tx.admin("tiktok"), enabled: tiktokEnabled, setEnabled: setTiktokEnabled,
                value: tiktok, set: setTiktok, placeholder: tx.admin("link_placeholder"),
              },
              {
                key: "x", label: tx.admin("x_network"), enabled: xEnabled, setEnabled: setXEnabled,
                value: xLink, set: setXLink, placeholder: tx.admin("link_placeholder"),
              },
            ].map(net => (
              <div key={net.key} className="border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-white text-sm font-medium">{net.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">{tx.admin("show_on_site")}</span>
                    <Toggle on={net.enabled} onChange={net.setEnabled} label={net.label} />
                  </div>
                </div>
                <label className="text-gray-400 text-xs mb-1 block">{tx.admin("link_label")}</label>
                <input value={net.value} onChange={e => net.set(e.target.value)} disabled={!net.enabled}
                  className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-40 ${net.enabled ? "" : "pointer-events-none"}`}
                  dir="ltr" placeholder={net.placeholder} />
              </div>
            ))}
          </div>
        </div>

        {/* Store Addresses & Maps */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#D4AF37]" />
            {lang === "ar" ? "عناوين المحل والخرائط" : lang === "fr" ? "Adresses de la boutique & Cartes" : "Store Addresses & Map Links"}
          </h2>
          <p className="text-gray-500 text-xs mb-5">
            {lang === "ar" ? "قم بإضافة عنوان المحل ورابط خرائط جوجل الخاص به داخل نفس الإطار." : lang === "fr" ? "Ajoutez chaque adresse de la boutique avec son lien Google Maps dans le même cadre." : "Add each store address and its map link together in the same frame."}
          </p>
          
          <div className="space-y-4">
            {addresses.slice(0, visibleAddresses).map((item, i) => (
              <div key={i} className="border border-white/10 bg-[#161622] rounded-xl p-4 shadow-sm relative space-y-3">
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    <span className="text-white text-sm font-semibold">
                      {[tx.admin("address1"), tx.admin("address2"), tx.admin("address3"), tx.admin("address4")][i]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">{tx.admin("show_on_site")}</span>
                      <Toggle on={item.enabled} onChange={v => patchAddress(i, { enabled: v })} label={`Address ${i+1}`} />
                    </div>
                    {visibleAddresses > 1 && (
                      <button type="button" onClick={() => removeAddress(i)} title={lang === "ar" ? "حذف العنوان" : "Supprimer"}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">
                    📍 {lang === "ar" ? "عنوان المحل" : lang === "fr" ? "Adresse de la boutique" : "Store Address"}
                  </label>
                  <input value={item.text} onChange={e => patchAddress(i, { text: e.target.value })} disabled={!item.enabled}
                    className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-40 ${item.enabled ? "" : "pointer-events-none"}`}
                    placeholder={tx.admin("address_placeholder")} />
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">
                    🗺️ {lang === "ar" ? "رابط موقع الخريطة (Google Maps)" : lang === "fr" ? "Lien Google Maps de l'adresse" : "Google Maps Link"}
                  </label>
                  <input value={item.url} onChange={e => patchAddress(i, { url: e.target.value })} disabled={!item.enabled}
                    className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-40 ${item.enabled ? "" : "pointer-events-none"}`}
                    dir="ltr" placeholder="https://maps.google.com/?q=..." />
                </div>
              </div>
            ))}

            {visibleAddresses < 4 && (
              <button type="button" onClick={() => setVisibleAddresses(v => v + 1)}
                className="w-full border border-dashed border-[#D4AF37]/30 rounded-xl py-3 text-[#D4AF37] text-sm font-medium hover:bg-[#D4AF37]/5 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                {lang === "ar" ? "+ إضافة عنوان جديد" : lang === "fr" ? "+ Ajouter une nouvelle adresse" : "+ Add new address"}
              </button>
            )}
          </div>
        </div>

        {/* Telegram Notifications */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
              {lang === "ar" ? "إشعارات تلغرام للطلبات" : lang === "fr" ? "Notifications Telegram" : "Telegram Notifications"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">{lang === "ar" ? "تفعيل" : "Activer"}</span>
              <Toggle on={telegramEnabled} onChange={setTelegramEnabled} label="Telegram" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mb-5">
            {lang === "ar" ? "تلقي إشعار فوري عند استلام أي طلب جديد مباشرة على حساب تلغرام الخاص بك." : lang === "fr" ? "Recevez une notification instantanée Telegram à chaque nouvelle commande." : "Receive instant Telegram notifications when new orders arrive."}
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Bot Token (توكن البوت)</label>
              <input value={TELEGRAM_BOT_TOKEN} readOnly tabIndex={-1}
                className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-gray-400 text-sm focus:outline-none disabled:opacity-40 select-none ${telegramEnabled ? "" : "pointer-events-none"}`}
                dir="ltr" placeholder="123456789:ABCdefGhIJKlmNoPQ..." />
              <p className="text-gray-500 text-[11px] mt-1">
                {lang === "ar" ? "رمز البوت ثابت ولا يمكن تعديله — يمكنك تغيير معرف المحادثة فقط." : "Token du bot fixe et non modifiable — seul le Chat ID peut être changé."}
              </p>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Chat ID (معرف المحادثة أو القناة)</label>
              <textarea value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} disabled={!telegramEnabled}
                className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-40 ${telegramEnabled ? "" : "pointer-events-none"} resize-y-none`}
                dir="ltr" rows={3}
                placeholder={lang === "ar" ? "987654321\n-1001234567890\n@channel" : lang === "fr" ? "987654321\n-1001234567890\n@channel" : "987654321\n-1001234567890\n@channel"}
              />
              <p className="text-gray-500 text-[11px] mt-1">
                {lang === "ar"
                  ? "أرسل الإشعارات إلى عدة حسابات: ضع معرّف كل حساب على سطر، أو افصلهم بـ ; أو ،"
                  : lang === "fr"
                  ? "Envoyer aux plusieurs comptes : un Chat ID par ligne, ou séparés par ; ou ,"
                  : "Send to multiple accounts: one Chat ID per line, or separated by ; or ,"}
              </p>
              {parseTelegramChatIds(telegramChatId).length > 0 && (
                <p className="text-[#D4AF37] text-[11px] mt-1">
                  {lang === "ar" ? "حساب/حسابات Telegram مُختار: " : lang === "fr" ? "Compte(s) Telegram ciblé(s) : " : "Telegram account(s) targeted: "}
                  {parseTelegramChatIds(telegramChatId).length}
                </p>
              )}
            </div>

            {testResult?.ok && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-xl">
                ✓ {lang === "ar" ? "تم إرسال الرسالة التجريبية بنجاح إلى حساب تلغرام الخاص بك!" : "Message test envoyé avec succès sur Telegram !"}
              </div>
            )}

            {testResult?.error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2.5 rounded-xl">
                ⚠️ {testResult.error}
              </div>
            )}

            <button type="button" onClick={handleTestTelegram} disabled={!telegramEnabled || testingTelegram || !telegramChatId}
              className="w-full border border-white/10 rounded-xl py-2.5 text-xs text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
              <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
              {testingTelegram ? (lang === "ar" ? "جاري الإرسال..." : "Envoi...") : (lang === "ar" ? "إرسال رسالة تجريبية لتلغرام" : "Envoyer un message test")}
            </button>
          </div>
        </div>

        {/* ntfy.sh Notifications (optional mirror of Telegram) */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-white font-semibold flex items-center gap-2">
              {lang === "ar" ? "إشعارات ntfy.sh" : lang === "fr" ? "Notifications ntfy.sh" : "ntfy.sh Notifications"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">{lang === "ar" ? "تفعيل" : "Activer"}</span>
              <Toggle on={ntfyEnabled} onChange={setNtfyEnabled} label="ntfy" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mb-5">
            {lang === "ar"
              ? "استقبل إشعارات الطلائق مباشرة على ntfy.sh بجانب تلغرام. أنشئ قناة خاصة أو استخدم قناة عامة."
              : lang === "fr"
              ? "Recevez les notifications commandes sur ntfy.sh en plus de Telegram. Créez ou utilisez un topic."
              : "Receive order notifications on ntfy.sh in addition to Telegram. Use a private or public topic."}
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">ntfy.sh Topic (معرف القناة)</label>
              <input value={ntfyTopic} onChange={(e) => setNtfyTopic(e.target.value)} disabled={!ntfyEnabled}
                className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-40 ${ntfyEnabled ? "" : "pointer-events-none"}`}
                dir="ltr" placeholder="ex: caftan-commandes" />
              <p className="text-gray-500 text-[11px] mt-1">
                {lang === "ar"
                  ? "أرسل الإشعارات إلى هذا الموضوع على ntfy.sh — افتح https://ntfy.sh/<topic> لاستقبالها."
                  : lang === "fr"
                  ? "Envoie les notifications vers ce topic ntfy.sh — ouvre https://ntfy.sh/<topic> pour les recevoir."
                  : "Send notifications to this ntfy.sh topic — open https://ntfy.sh/<topic> to receive them."}
              </p>
            </div>

            {ntfyResult?.ok && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-xl">
                ✓ {lang === "ar" ? "تم إرسال اختبار ntfy بنجاح!" : lang === "fr" ? "Test ntfy envoyé avec succès !" : "ntfy test sent successfully!"}
              </div>
            )}
            {ntfyResult?.error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2.5 rounded-xl">
                ⚠️ {ntfyResult.error}
              </div>
            )}

            <button type="button" onClick={handleTestNtfy} disabled={!ntfyEnabled || testingNtfy || !ntfyTopic}
              className="w-full border border-white/10 rounded-xl py-2.5 text-xs text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
              <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
              {testingNtfy ? (lang === "ar" ? "جاري الإرسال..." : "Envoi...") : (lang === "ar" ? "إرسال اختبار ntfy" : lang === "fr" ? "Envoyer un test ntfy" : "Send ntfy test")}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#D4AF37]" />
            {tx.admin("change_password")}
          </h2>
          <p className="text-gray-500 text-xs mb-5">{tx.admin("change_password_hint")}</p>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">{tx.admin("current_password")}</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password" maxLength={72}
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                  dir="ltr" placeholder="••••••••••••" />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={tx.admin("current_password")}>
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">{tx.admin("new_password")}</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password" maxLength={72}
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                  dir="ltr" placeholder="••••••••••••" />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={tx.admin("new_password")}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">{tx.admin("confirm_password")}</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password" maxLength={72}
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                  dir="ltr" placeholder="••••••••••••" />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={tx.admin("confirm_password")}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {pwError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-xl">
                ⚠️ {pwError}
              </div>
            )}
            {pwDone && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-2.5 rounded-xl">
                ✓ {tx.admin("password_updated")}
              </div>
            )}

            <button onClick={handleChangePassword} disabled={isChanging}
              className={`flex items-center gap-2 w-full justify-center py-3 rounded-xl font-bold transition-all disabled:opacity-60 ${
                pwDone ? "bg-emerald-500 text-black" : "bg-white/10 text-white hover:bg-white/15"}`}>
              {isChanging ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>{tx.admin("saving")}</span>
                </>
              ) : (
                <>{tx.admin("change_password")}</>
              )}
            </button>
          </div>
        </div>

        {/* Save Settings Button */}
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 w-full justify-center py-3 rounded-xl font-bold transition-all disabled:opacity-60 ${saved ? "bg-[#D4AF37] text-black" : "bg-[#D4AF37] text-black hover:bg-[#c29c2d]"}`}>
          <Save className="w-4 h-4" />
          {saving ? tx.admin("saving") : saved ? tx.admin("saved") : tx.admin("save_settings")}
        </button>
      </div>
    </div>
  );
}
