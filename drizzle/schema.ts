import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Supports both internal authentication (email/password) and OAuth.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) - optional for internal auth users */
  openId: varchar("openId", { length: 64 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Hashed password for internal authentication */
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: mysqlEnum("loginMethod", ["internal", "oauth"]).default("internal").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Approval status for new registrations */
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  /** Sector/department the user belongs to */
  sector: mysqlEnum("sector", ["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações", "Outro"]).default("Outro"),
  /** Permission group ID (optional) */
  groupId: int("groupId"),
  /** Module permissions stored as JSON array */
  permissions: json("permissions").$defaultFn(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tickets table for help desk system
 */
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: varchar("ticketId", { length: 32 }).notNull().unique(), // e.g., "bilhete_1"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["Técnico", "Acesso", "Funcionalidade", "Dúvida", "Outro"]).default("Técnico").notNull(),
  priority: mysqlEnum("priority", ["Baixa", "Média", "Alta", "Crítica"]).default("Média").notNull(),
  status: mysqlEnum("status", ["Aberto", "Em Progresso", "Aguardando", "Resolvido", "Fechado"]).default("Aberto").notNull(),
  sector: mysqlEnum("sector", ["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações"]).default("TI").notNull(),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  assignedToId: int("assignedToId"),
  assignedToName: varchar("assignedToName", { length: 255 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(), // Unix timestamp in milliseconds
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * Comments on tickets
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  authorId: int("authorId").notNull(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Activity feed for tickets
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  type: mysqlEnum("type", ["status_change", "priority_change", "assignment", "comment", "created", "sector_change"]).notNull(),
  authorId: int("authorId").notNull(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  oldValue: varchar("oldValue", { length: 255 }),
  newValue: varchar("newValue", { length: 255 }),
  description: text("description"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * Attachments on tickets
 */
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  uploadedById: int("uploadedById").notNull(),
  uploadedByName: varchar("uploadedByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

/**
 * Announcements for the portal
 */
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  type: mysqlEnum("type", ["info", "warning", "success", "error"]).default("info").notNull(),
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  createdById: int("createdById").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  expiresAt: bigint("expiresAt", { mode: "number" }),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

/**
 * Projects table for project management
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectId: varchar("projectId", { length: 32 }).notNull().unique(), // e.g., "proj_1"
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["Planejamento", "Em Andamento", "Em Pausa", "Concluído", "Cancelado"]).default("Planejamento").notNull(),
  priority: mysqlEnum("priority", ["Baixa", "Média", "Alta", "Crítica"]).default("Média").notNull(),
  ownerId: int("ownerId").notNull(), // Project owner/manager
  ownerName: varchar("ownerName", { length: 255 }).notNull(),
  sector: mysqlEnum("sector", ["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações"]).default("TI").notNull(),
  startDate: bigint("startDate", { mode: "number" }), // Unix timestamp in milliseconds
  endDate: bigint("endDate", { mode: "number" }), // Unix timestamp in milliseconds
  progress: int("progress").default(0).notNull(), // 0-100
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project phases/milestones
 */
export const projectPhases = mysqlTable("projectPhases", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["Pendente", "Em Andamento", "Concluída", "Atrasada"]).default("Pendente").notNull(),
  order: int("order").notNull(), // Display order
  startDate: bigint("startDate", { mode: "number" }),
  endDate: bigint("endDate", { mode: "number" }),
  completedAt: bigint("completedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type ProjectPhase = typeof projectPhases.$inferSelect;
export type InsertProjectPhase = typeof projectPhases.$inferInsert;

/**
 * Comments on projects for team communication
 */
export const projectComments = mysqlTable("projectComments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  authorId: int("authorId").notNull(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  content: text("content").notNull(),
  mentions: text("mentions"), // JSON array of mentioned user IDs
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = typeof projectComments.$inferInsert;

/**
 * Permission groups (profiles) for easier permission management
 */
export const permissionGroups = mysqlTable("permissionGroups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  permissions: json("permissions").notNull(), // JSON object with module permissions
  isDefault: boolean("isDefault").default(false).notNull(), // Whether this is a default group
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type PermissionGroup = typeof permissionGroups.$inferSelect;
export type InsertPermissionGroup = typeof permissionGroups.$inferInsert;
