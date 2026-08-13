import { getAdminSession } from "../actions";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");
  const settings = await getSiteSettings();
  // Le token du bot n'est jamais encodé dans le bundle client : on le transmet
  // depuis le serveur (D1, complété par l'env si vide) pour qu'il s'affiche
  // dans la page admin sans être embarqué dans le JS public.
  if (!settings.telegram_bot_token?.trim()) {
    settings.telegram_bot_token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  }
  return <SettingsClient initialSettings={settings} />;
}
