"use server";
import { dbGetAllOrders } from "@/lib/orders-db";
import { getAdminSession } from "../actions";
import { redirect } from "next/navigation";
import OrdersClient, { OrderItem } from "./OrdersClient";

export default async function OrdersPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");

  const orders = await dbGetAllOrders();
  return <OrdersClient initialOrders={orders as OrderItem[]} />;
}
