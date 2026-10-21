import type { Config } from "@netlify/functions";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { items, paymentMethods, reservations } from "../../db/schema.js";

// Public read-only endpoints: available cars, active payment methods, booked dates.
export default async (req: Request) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const url = new URL(req.url);

  if (url.pathname === "/api/items") {
    const rows = await db.select().from(items).where(eq(items.disponible, true)).orderBy(asc(items.id));
    return Response.json(rows);
  }

  if (url.pathname === "/api/payment-methods") {
    const rows = await db
      .select({ id: paymentMethods.id, nomMethode: paymentMethods.nomMethode, instructions: paymentMethods.instructions })
      .from(paymentMethods)
      .where(eq(paymentMethods.estActif, true))
      .orderBy(asc(paymentMethods.id));
    return Response.json(rows);
  }

  // Only approved date ranges are exposed — no client details.
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({ itemId: reservations.itemId, dateDebut: reservations.dateDebut, dateFin: reservations.dateFin })
    .from(reservations)
    .where(and(eq(reservations.statut, "approuve"), gte(reservations.dateFin, today)));
  return Response.json(rows);
};

export const config: Config = {
  path: ["/api/items", "/api/payment-methods", "/api/availability"],
};
