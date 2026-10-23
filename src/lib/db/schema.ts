/**
 * Domain schema (draft for Entrega 3). Ported from docs/02_modelo_bd.sql and the
 * logical view in the team's architecture document. Column names are camelCase here
 * and snake_case in Postgres (drizzle `casing: "snake_case"`).
 *
 * Open points are tracked in docs/llm/decisions.md; do not "fix" them silently.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const createdBy = () => text().references(() => user.id);
const measure = () => numeric({ precision: 10, scale: 3, mode: "number" });

export const recordStatus = pgEnum("record_status", ["active", "inactive", "retired"]);
export const equipmentType = pgEnum("equipment_type", ["alveograph", "farinograph"]);

// RF-03 · UC-02
export const clients = pgTable("clients", {
  id: uuid().primaryKey().defaultRandom(),
  sapKey: varchar({ length: 10 }).notNull().unique(),
  businessName: varchar({ length: 150 }).notNull(),
  rfc: varchar({ length: 13 }),
  deliveryAddress: varchar({ length: 250 }),
  contactName: varchar({ length: 100 }),
  contactEmail: varchar({ length: 100 }),
  requiresCertificate: boolean().notNull().default(true),
  status: recordStatus().notNull().default("active"),
  statusReason: varchar({ length: 200 }),
  createdAt: createdAt(),
  createdBy: createdBy(),
});

// RF-02 · UC-01. id is the random, unique key the app generates (BR-EQP-01).
export const equipment = pgTable("equipment", {
  id: char({ length: 8 }).primaryKey(),
  type: equipmentType().notNull(),
  shortDescription: varchar({ length: 60 }).notNull(),
  longDescription: text(),
  brand: varchar({ length: 40 }),
  model: varchar({ length: 40 }),
  serialNumber: varchar({ length: 30 }).unique(),
  supplier: varchar({ length: 80 }),
  acquiredOn: date(),
  warrantyUntil: date(),
  location: varchar({ length: 80 }),
  responsible: varchar({ length: 100 }),
  status: recordStatus().notNull().default("active"),
  statusReason: varchar({ length: 200 }),
  createdAt: createdAt(),
  createdBy: createdBy(),
});

// Catalog of the ten mandatory parameters, seeded from src/lib/domain/parameters.ts
export const parameters = pgTable("parameters", {
  code: varchar({ length: 10 }).primaryKey(),
  equipmentType: equipmentType().notNull(),
  label: varchar({ length: 60 }).notNull(),
  unit: varchar({ length: 15 }).notNull().default(""),
});

// RF-02 / RF-03. International reference limits, one row per parameter (D-07).
// A client without its own limit for a parameter falls back to this row (BR-REF-01).
export const internationalLimits = pgTable(
  "international_limits",
  {
    parameterCode: varchar({ length: 10 })
      .primaryKey()
      .references(() => parameters.code),
    lowerLimit: measure().notNull(),
    upperLimit: measure().notNull(),
    updatedAt: createdAt(),
    updatedBy: createdBy(),
  },
  (t) => [check("international_limits_range_ck", sql`${t.lowerLimit} <= ${t.upperLimit}`)],
);

// RF-03. A client's own limits, zero to ten rows per client.
export const clientLimits = pgTable(
  "client_limits",
  {
    clientId: uuid()
      .notNull()
      .references(() => clients.id),
    parameterCode: varchar({ length: 10 })
      .notNull()
      .references(() => parameters.code),
    lowerLimit: measure().notNull(),
    upperLimit: measure().notNull(),
    updatedAt: createdAt(),
    updatedBy: createdBy(),
  },
  (t) => [
    primaryKey({ columns: [t.clientId, t.parameterCode] }),
    check("client_limits_range_ck", sql`${t.lowerLimit} <= ${t.upperLimit}`),
  ],
);

// Lots (lote de producción)
export const lots = pgTable("lots", {
  id: varchar({ length: 20 }).primaryKey(),
  product: varchar({ length: 60 }).notNull(),
  producedOn: date().notNull(),
  expiresOn: date().notNull(),
  status: recordStatus().notNull().default("active"),
  createdAt: createdAt(),
  createdBy: createdBy(),
});

// RF-04 · UC-03. sequence = A..Z, AA.. (src/lib/domain/inspection-sequence.ts)
export const inspections = pgTable(
  "inspections",
  {
    id: serial().primaryKey(),
    lotId: varchar({ length: 20 })
      .notNull()
      .references(() => lots.id),
    sequence: varchar({ length: 3 }).notNull(),
    inspectedAt: createdAt(),
    // Re-inspection after an equipment failure needs an authorization note (BR-INS-04)
    reinspectionReason: varchar({ length: 200 }),
    // Set when a certificate uses it. From then on results are read-only (BR-AUD-03)
    lockedAt: timestamp({ withTimezone: true }),
    createdBy: createdBy(),
  },
  (t) => [uniqueIndex("inspections_lot_sequence_uq").on(t.lotId, t.sequence)],
);

export const inspectionResults = pgTable(
  "inspection_results",
  {
    inspectionId: integer()
      .notNull()
      .references(() => inspections.id),
    parameterCode: varchar({ length: 10 })
      .notNull()
      .references(() => parameters.code),
    equipmentId: char({ length: 8 })
      .notNull()
      .references(() => equipment.id),
    value: measure().notNull(),
  },
  (t) => [primaryKey({ columns: [t.inspectionId, t.parameterCode] })],
);

// RF-05 · UC-05
export const certificateStatus = pgEnum("certificate_status", ["draft", "issued", "sent"]);

export const certificates = pgTable(
  "certificates",
  {
    id: varchar({ length: 16 }).primaryKey(),
    clientId: uuid()
      .notNull()
      .references(() => clients.id),
    lotId: varchar({ length: 20 })
      .notNull()
      .references(() => lots.id),
    inspectionId: integer()
      .notNull()
      .references(() => inspections.id),
    purchaseOrder: varchar({ length: 20 }).notNull(),
    invoiceNumber: varchar({ length: 20 }),
    quantityRequested: measure(),
    quantityDelivered: measure(),
    shippedOn: date(),
    requiresSignature: boolean().notNull().default(false),
    status: certificateStatus().notNull().default("draft"),
    pdfUrl: text(),
    issuedAt: timestamp({ withTimezone: true }),
    issuedBy: createdBy(),
    createdAt: createdAt(),
  },
  (t) => [index("certificates_client_idx").on(t.clientId), index("certificates_lot_idx").on(t.lotId)],
);

// Snapshot of what the certificate printed, so history never changes (RF-07)
export const certificateLines = pgTable(
  "certificate_lines",
  {
    certificateId: varchar({ length: 16 })
      .notNull()
      .references(() => certificates.id),
    parameterCode: varchar({ length: 10 })
      .notNull()
      .references(() => parameters.code),
    value: measure().notNull(),
    lowerLimit: measure().notNull(),
    upperLimit: measure().notNull(),
    deviation: measure().notNull(),
  },
  (t) => [primaryKey({ columns: [t.certificateId, t.parameterCode] })],
);

// RF-06 · UC-06. Evidence of each delivery attempt
export const deliveries = pgTable("deliveries", {
  id: serial().primaryKey(),
  certificateId: varchar({ length: 16 })
    .notNull()
    .references(() => certificates.id),
  recipients: text().array().notNull(),
  succeeded: boolean().notNull(),
  error: text(),
  sentAt: createdAt(),
  sentBy: createdBy(),
});

// RF-08. Append-only audit log; employee id and name are copied so the row survives user changes
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial().primaryKey(),
    at: createdAt(),
    userId: text().references(() => user.id),
    employeeId: varchar({ length: 10 }),
    userName: varchar({ length: 100 }),
    action: varchar({ length: 40 }).notNull(),
    entity: varchar({ length: 30 }).notNull(),
    entityId: varchar({ length: 40 }).notNull(),
    detail: jsonb(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
