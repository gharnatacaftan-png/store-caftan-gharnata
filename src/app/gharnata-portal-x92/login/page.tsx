"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "../actions";
import { Eye, EyeOff, Lock, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";

// SubmitButton is a child of the <form>, so useFormStatus() reliably reflects the
// in-flight state of the form action — the spinner shows from the very first
// millisecond and the input is disabled while the ~1s bcrypt verify runs.
function SubmitButton() {
  const { pending } = useFormStatus();
  const { lang } = useLang();
  const tx = t(lang);

  return (
    <motion.button
      whileHover={pending ? {} : { scale: 1.01 }}
      whileTap={pending ? {} : { scale: 0.99 }}
      type="submit"
      disabled={pending}
      className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#c29c2d] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          <span>{tx.admin("login_pending")}</span>
        </>
      ) : (
        <>
          <LogIn className="w-5 h-5" />
          {tx.admin("login_btn")}
        </>
      )}
    </motion.button>
  );
}

export default function LoginPage() {
  const { lang, dir } = useLang();
  const tx = t(lang);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    try {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.ok) {
        sessionStorage.setItem("gharnata_admin_tab", "active");
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = result.redirectTo;
      }
    } catch (err) {
      // Never let a thrown server action leave the form frozen with no feedback.
      console.error("[login] unexpected error:", err);
      setError(tx.admin("login_server_error"));
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex items-center justify-center p-4" dir={dir}>
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-[#111118] border border-[#D4AF37]/20 rounded-3xl p-8 shadow-2xl shadow-black/60">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-white">{tx.admin("login_title")}</h1>
            <p className="text-[#D4AF37]/60 text-sm mt-1">{tx.admin("brand")}</p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {tx.admin("password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  maxLength={72} // bcrypt only uses the first 72 bytes anyway
                  autoComplete="current-password"
                  className="w-full bg-[#1a1a24] border border-[#D4AF37]/20 rounded-xl pr-4 pl-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:border-[#D4AF37]/50 transition-all text-right"
                  placeholder="••••••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={tx.admin("password")}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl"
              >
                ⚠️ {error}
              </motion.div>
            )}

            <SubmitButton />
          </form>

          <p className="text-center text-gray-600 text-xs mt-6">
            {tx.admin("login_security")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
