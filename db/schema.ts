import { bigint, boolean, date, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// 1. Kliyan
export const clients = pgTable("clients", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  nom: text().notNull(),
  prenom: text().notNull(),
  email: text().notNull().unique(),
  telephone: text(),
});

// 2. Machin pou lwe
export const items = pgTable("items", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  titre: text().notNull(),
  description: text(),
  prixParJour: numeric("prix_par_jour").notNull(),
  disponible: boolean().default(true),
  whatsapp: text(),
  emailContact: text("email_contact"),
  adresse: text(),
});

// 3. Rezèvasyon — statut: 'en_attente' | 'approuve' | 'annule'
export const reservations = pgTable("reservations", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  clientId: bigint("client_id", { mode: "number" }).references(() => clients.id),
  itemId: bigint("item_id", { mode: "number" }).references(() => items.id),
  dateDebut: date("date_debut").notNull(),
  dateFin: date("date_fin").notNull(),
  prixTotal: numeric("prix_total").notNull(),
  statut: text().default("en_attente"),
});

// 4. Opsyon peman
export const paymentMethods = pgTable("payment_methods", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  nomMethode: text("nom_methode").notNull(),
  estActif: boolean("est_actif").default(true),
  instructions: text(),
});
