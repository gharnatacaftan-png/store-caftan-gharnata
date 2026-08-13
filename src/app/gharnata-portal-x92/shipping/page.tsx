import { dbGetAllRates } from "@/lib/shipping-db";
import { getAdminSession } from "../actions";
import { redirect } from "next/navigation";
import ShippingClient from "./ShippingClient";

export default async function ShippingPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");

  const rates = await dbGetAllRates();
  return <ShippingClient initialRates={rates} />;
}
