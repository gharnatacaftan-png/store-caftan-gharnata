import { getAdminSession } from "../actions";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");
  return <AnalyticsClient />;
}
