import { redirect } from "next/navigation";
import { getAdminSession } from "../actions";
import { dbGetStorageOverview } from "@/lib/storage-db";
import CleanupClient from "./CleanupClient";

export default async function CleanupPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");

  const storage = await dbGetStorageOverview();
  return <CleanupClient initialOverview={storage} />;
}
