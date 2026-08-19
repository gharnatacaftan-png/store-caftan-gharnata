import { getAdminSession } from "../actions";
import { redirect } from "next/navigation";
import LoginLogsClient from "./LoginLogsClient";

export default async function LoginLogsPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");
  return <LoginLogsClient />;
}
