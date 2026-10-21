import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clients, items, paymentMethods, reservations } from "../../db/schema.js";

const STATUTS = ["en_attente", "approuve", "annule"];

const bad = (message: string, status = 400) => Response.json({ error: message }, { status });

const text = (v: unknown) => (v == null ? null : String(v).trim() || null);

function price(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : null;
}

// Admin-only management API. Requires a Netlify Identity user with the "admin" role.
export default async (req: Request) => {
  const user = await getUser();
  if (!user) return bad("Ou pa konekte.", 401);
  if (!user.roles?.includes("admin")) return bad("Ou pa gen dwa administratè.", 403);

  const url = new URL(req.url);
  const [, , , resource, rawId] = url.pathname.split("/"); // /api/admin/:resource/:id?
  const id = rawId ? Number(rawId) : null;
  if (rawId && (!Number.isInteger(id) || id! <= 0)) return bad("ID pa valid.");
  const body: Record<string, any> = ["POST", "PATCH"].includes(req.method) ? await req.json().catch(() => ({})) : {};

  if (resource === "reservations") {
    if (req.method === "GET") {
      const rows = await db
        .select({
          id: reservations.id,
          createdAt: reservations.createdAt,
          dateDebut: reservations.dateDebut,
          dateFin: reservations.dateFin,
          prixTotal: reservations.prixTotal,
          statut: reservations.statut,
          itemId: reservations.itemId,
          titre: items.titre,
          nom: clients.nom,
          prenom: clients.prenom,
          email: clients.email,
          telephone: clients.telephone,
        })
        .from(reservations)
        .leftJoin(items, eq(reservations.itemId, items.id))
        .leftJoin(clients, eq(reservations.clientId, clients.id))
        .orderBy(desc(reservations.createdAt));
      return Response.json(rows);
    }
    if (req.method === "PATCH" && id) {
      if (!STATUTS.includes(body.statut)) return bad("Estati pa valid.");
      const [row] = await db.update(reservations).set({ statut: body.statut }).where(eq(reservations.id, id)).returning();
      return row ? Response.json(row) : bad("Rezèvasyon pa jwenn.", 404);
    }
  }

  if (resource === "items") {
    if (req.method === "GET") {
      return Response.json(await db.select().from(items).orderBy(asc(items.id)));
    }
    if (req.method === "POST") {
      const titre = text(body.titre);
      const prixParJour = price(body.prixParJour);
      if (!titre || prixParJour == null) return bad("Non machin nan ak yon pri valid obligatwa.");
      const [row] = await db
        .insert(items)
        .values({
          titre,
          prixParJour,
          description: text(body.description),
          disponible: body.disponible !== false,
          whatsapp: text(body.whatsapp),
          emailContact: text(body.emailContact),
          adresse: text(body.adresse),
        })
        .returning();
      return Response.json(row, { status: 201 });
    }
    if (req.method === "PATCH" && id) {
      const patch: Partial<typeof items.$inferInsert> = {};
      if ("titre" in body) {
        const titre = text(body.titre);
        if (!titre) return bad("Non machin nan obligatwa.");
        patch.titre = titre;
      }
      if ("prixParJour" in body) {
        const p = price(body.prixParJour);
        if (p == null) return bad("Pri a pa valid.");
        patch.prixParJour = p;
      }
      if ("disponible" in body) patch.disponible = Boolean(body.disponible);
      for (const k of ["description", "whatsapp", "emailContact", "adresse"] as const) {
        if (k in body) patch[k] = text(body[k]);
      }
      if (!Object.keys(patch).length) return bad("Pa gen anyen pou chanje.");
      const [row] = await db.update(items).set(patch).where(eq(items.id, id)).returning();
      return row ? Response.json(row) : bad("Machin pa jwenn.", 404);
    }
  }

  if (resource === "payment-methods") {
    if (req.method === "GET") {
      return Response.json(await db.select().from(paymentMethods).orderBy(asc(paymentMethods.id)));
    }
    if (req.method === "PATCH" && id) {
      const patch: Partial<typeof paymentMethods.$inferInsert> = {};
      if ("estActif" in body) patch.estActif = Boolean(body.estActif);
      if ("instructions" in body) patch.instructions = text(body.instructions);
      if (!Object.keys(patch).length) return bad("Pa gen anyen pou chanje.");
      const [row] = await db.update(paymentMethods).set(patch).where(eq(paymentMethods.id, id)).returning();
      return row ? Response.json(row) : bad("Metòd peman pa jwenn.", 404);
    }
  }

  return bad("Pa jwenn.", 404);
};

export const config: Config = {
  path: ["/api/admin/:resource", "/api/admin/:resource/:id"],
};
