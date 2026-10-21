import type { Config } from "@netlify/functions";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clients, items, reservations } from "../../db/schema.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bad = (message: string, status = 400) => Response.json({ error: message }, { status });

// Public booking request: creates (or reuses) the client by email and a pending reservation.
export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Done yo pa valid.");
  }

  const str = (k: string) => String(body[k] ?? "").trim();
  const nom = str("nom"), prenom = str("prenom"), email = str("email").toLowerCase(), telephone = str("telephone");
  const dateDebut = str("date_debut"), dateFin = str("date_fin");
  const itemId = Number(body.item_id);

  if (!nom || !prenom) return bad("Tanpri mete non ak siyati ou.");
  if (!EMAIL_RE.test(email)) return bad("Imèl la pa valid.");
  if (!Number.isInteger(itemId) || itemId <= 0) return bad("Tanpri chwazi yon machin.");
  if (!DATE_RE.test(dateDebut) || !DATE_RE.test(dateFin)) return bad("Dat yo pa valid.");
  if (dateFin < dateDebut) return bad("Dat remèt la dwe menm jou oswa apre dat ou pran machin nan.");
  if (dateDebut < new Date().toISOString().slice(0, 10)) return bad("Dat pou pran machin nan deja pase.");

  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item || !item.disponible) return bad("Machin sa a pa disponib.", 404);

  const clash = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.itemId, itemId),
        eq(reservations.statut, "approuve"),
        lte(reservations.dateDebut, dateFin),
        gte(reservations.dateFin, dateDebut),
      ),
    )
    .limit(1);
  if (clash.length) return bad("Machin nan deja rezève pou dat sa yo. Chwazi lòt dat.", 409);

  // Price is always computed server-side: at least one day.
  const days = Math.max(1, Math.round((Date.parse(dateFin) - Date.parse(dateDebut)) / 86_400_000));
  const prixTotal = (days * Number(item.prixParJour)).toFixed(2);

  // Existing clients are reused by email; their stored details are not overwritten by public requests.
  await db.insert(clients).values({ nom, prenom, email, telephone: telephone || null }).onConflictDoNothing({ target: clients.email });
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.email, email));

  const [reservation] = await db
    .insert(reservations)
    .values({ clientId: client.id, itemId, dateDebut, dateFin, prixTotal })
    .returning();

  return Response.json({ ...reservation, jours: days, titre: item.titre }, { status: 201 });
};

export const config: Config = {
  path: "/api/reservations",
};
