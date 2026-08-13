"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "../actions";
import { adminT } from "@/lib/admin-lang";
import { dbCleanProductMedia, dbDeleteProductWithMedia, dbDeleteSingleMedia, dbDeleteOrphans } from "@/lib/storage-db";

export async function deleteWithMediaAction(id: number) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    const admin = await adminT();
    return { error: admin("unauthorized") };
  }

  await dbDeleteProductWithMedia(id);
  revalidatePath("/gharnata-portal-x92");
  revalidatePath("/gharnata-portal-x92/cleanup");
  revalidatePath("/gharnata-portal-x92/products");
  return { ok: true };
}

export async function cleanMediaAction(id: number) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    const admin = await adminT();
    return { error: admin("unauthorized") };
  }

  await dbCleanProductMedia(id);
  revalidatePath("/gharnata-portal-x92");
  revalidatePath("/gharnata-portal-x92/cleanup");
  revalidatePath("/gharnata-portal-x92/products");
  return { ok: true };
}

export async function deleteSingleMediaAction(mediaId: number) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    const admin = await adminT();
    return { error: admin("unauthorized") };
  }

  await dbDeleteSingleMedia(mediaId);
  revalidatePath("/gharnata-portal-x92");
  revalidatePath("/gharnata-portal-x92/cleanup");
  revalidatePath("/gharnata-portal-x92/products");
  return { ok: true };
}

export async function deleteOrphansAction() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    const admin = await adminT();
    return { error: admin("unauthorized") };
  }

  const { deleted, bytes } = await dbDeleteOrphans();
  revalidatePath("/gharnata-portal-x92");
  revalidatePath("/gharnata-portal-x92/cleanup");
  return { ok: true, deleted, bytes };
}
