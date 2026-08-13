import { dbGetAllProducts } from "@/lib/products-db";
import { getAdminSession } from "../actions";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");

  const products = await dbGetAllProducts(false);
  return <ProductsClient initialProducts={products} />;
}
