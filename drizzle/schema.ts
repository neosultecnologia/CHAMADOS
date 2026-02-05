import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, json, boolean, index, date } from "drizzle-orm/mysql-core";

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
  /** Department ID - references departments table */
  departmentId: int("departmentId"),
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
 * Departments/Sectors table
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("name_idx").on(table.name),
}));

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

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
  departmentId: int("departmentId"),
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
 * Daily tasks within projects for day-to-day work tracking
 */
export const dailyTasks = mysqlTable("dailyTasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["Pendente", "Em Andamento", "Concluída"]).default("Pendente").notNull(),
  priority: mysqlEnum("priority", ["Baixa", "Média", "Alta", "Crítica"]).default("Média").notNull(),
  assignedToId: int("assignedToId"),
  assignedToName: varchar("assignedToName", { length: 255 }),
  dueDate: bigint("dueDate", { mode: "number" }), // Unix timestamp for the day this task is due
  completedAt: bigint("completedAt", { mode: "number" }),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = typeof dailyTasks.$inferInsert;

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

/**
 * Suppliers table for purchasing module
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).unique(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  status: mysqlEnum("status", ["Ativo", "Inativo", "Bloqueado"]).default("Ativo").notNull(),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Products/Medicines table for purchasing module
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 20 }).default("UN").notNull(), // UN, CX, FR, etc
  minStock: int("minStock").default(0),
  currentStock: int("currentStock").default(0),
  status: mysqlEnum("status", ["Ativo", "Inativo"]).default("Ativo").notNull(),
  requiresPrescription: boolean("requiresPrescription").default(false),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Quotations table for price comparison
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotationNumber", { length: 32 }).notNull().unique(),
  supplierId: int("supplierId").notNull(),
  supplierName: varchar("supplierName", { length: 255 }).notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // Price in cents
  totalPrice: int("totalPrice").notNull(), // Total in cents
  deliveryDays: int("deliveryDays"),
  status: mysqlEnum("status", ["Pendente", "Aprovada", "Rejeitada", "Expirada"]).default("Pendente").notNull(),
  validUntil: bigint("validUntil", { mode: "number" }),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * Purchase Orders table
 */
export const purchaseOrders = mysqlTable("purchaseOrders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  supplierId: int("supplierId").notNull(),
  supplierName: varchar("supplierName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["Rascunho", "Pendente", "Aprovado", "Enviado", "Recebido Parcial", "Recebido", "Cancelado"]).default("Rascunho").notNull(),
  totalAmount: int("totalAmount").notNull(), // Total in cents
  expectedDelivery: bigint("expectedDelivery", { mode: "number" }),
  actualDelivery: bigint("actualDelivery", { mode: "number" }),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  notes: text("notes"),
  approvedById: int("approvedById"),
  approvedByName: varchar("approvedByName", { length: 255 }),
  approvedAt: bigint("approvedAt", { mode: "number" }),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Purchase Order Items table
 */
export const purchaseOrderItems = mysqlTable("purchaseOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  productId: int("productId").notNull(),
  productCode: varchar("productCode", { length: 50 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // Price in cents
  totalPrice: int("totalPrice").notNull(), // Total in cents
  receivedQuantity: int("receivedQuantity").default(0).notNull(),
  notes: text("notes"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

// Database Backups
export const backups = mysqlTable("backups", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }).notNull(), // Size in bytes
  checksum: varchar("checksum", { length: 64 }).notNull(), // SHA-256 hash
  status: mysqlEnum("status", ["completed", "failed", "in_progress"]).default("in_progress").notNull(),
  s3Key: varchar("s3Key", { length: 512 }).notNull(), // S3 storage path
  s3Url: varchar("s3Url", { length: 1024 }).notNull(), // S3 public URL
  tablesBackedUp: json("tablesBackedUp").$defaultFn(() => []), // List of table names
  recordCount: int("recordCount").default(0).notNull(), // Total records backed up
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  createdBy: varchar("createdBy", { length: 255 }).notNull(),
});

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = typeof backups.$inferInsert;

/**
 * Purchasing Tasks table for Kanban board
 */
export const purchasingTasks = mysqlTable("purchasing_tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [
    "todo",           // A Fazer
    "quoting",        // Cotando
    "awaiting_approval", // Aguardando Aprovação
    "ordered",        // Pedido Realizado
    "received",       // Recebido
    "completed"       // Concluído
  ]).default("todo").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  assignedToId: int("assignedToId"), // User responsible
  tags: text("tags"), // Comma-separated tags like "Urgente, Estoque Baixo, Cotação"
  dueDate: date("dueDate"),
  position: int("position").default(0).notNull(), // For ordering within column
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("status_idx").on(table.status),
  assignedToIdx: index("assigned_to_idx").on(table.assignedToId),
}));

export type PurchasingTask = typeof purchasingTasks.$inferSelect;
export type InsertPurchasingTask = typeof purchasingTasks.$inferInsert;

/**
 * Kanban Column Settings - stores custom names for Kanban columns
 */
export const kanbanColumnSettings = mysqlTable("kanban_column_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Each user can have their own column names
  module: varchar("module", { length: 50 }).notNull(), // e.g., "purchasing_tasks"
  columnKey: varchar("columnKey", { length: 50 }).notNull(), // e.g., "todo", "quoting", etc.
  customName: varchar("customName", { length: 100 }).notNull(), // User's custom name
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userModuleColumnIdx: index("user_module_column_idx").on(table.userId, table.module, table.columnKey),
}));

export type KanbanColumnSetting = typeof kanbanColumnSettings.$inferSelect;
export type InsertKanbanColumnSetting = typeof kanbanColumnSettings.$inferInsert;


/**
 * Notifications table for real-time alerts
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Target user
  type: mysqlEnum("type", [
    "stock_critical",     // Estoque crítico (abaixo do mínimo)
    "stock_low",          // Estoque baixo (próximo do mínimo)
    "request_created",    // Nova solicitação criada
    "request_updated",    // Solicitação atualizada
    "request_completed",  // Solicitação concluída
    "task_assigned",      // Tarefa atribuída
    "task_due_soon",      // Tarefa com prazo próximo
    "system"              // Notificação do sistema
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  /** Reference to related entity (productId, taskId, etc) */
  referenceId: int("referenceId"),
  referenceType: varchar("referenceType", { length: 50 }), // "product", "task", "ticket", etc
  /** Link to navigate when clicking the notification */
  actionUrl: varchar("actionUrl", { length: 512 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (table) => ({
  userIdx: index("notification_user_idx").on(table.userId),
  userReadIdx: index("notification_user_read_idx").on(table.userId, table.isRead),
  typeIdx: index("notification_type_idx").on(table.type),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;


/**
 * Chat Conversations - Each conversation can be linked to a ticket
 */
export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  /** Optional link to a ticket */
  ticketId: int("ticketId"),
  /** Conversation title/subject */
  title: varchar("title", { length: 255 }),
  /** Type of conversation */
  type: mysqlEnum("type", ["ticket_chat", "direct_message", "support_request"]).default("ticket_chat").notNull(),
  /** Status of the conversation */
  status: mysqlEnum("status", ["active", "waiting", "resolved", "closed"]).default("active").notNull(),
  /** Last message timestamp for ordering */
  lastMessageAt: bigint("lastMessageAt", { mode: "number" }),
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
}, (table) => ({
  ticketIdx: index("chat_ticket_idx").on(table.ticketId),
  statusIdx: index("chat_status_idx").on(table.status),
  lastMessageIdx: index("chat_last_message_idx").on(table.lastMessageAt),
}));

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

/**
 * Chat Participants - Users involved in a conversation
 */
export const chatParticipants = mysqlTable("chat_participants", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }).notNull(),
  /** Role in the conversation */
  role: mysqlEnum("role", ["user", "operator", "admin"]).default("user").notNull(),
  /** Last time user read messages in this conversation */
  lastReadAt: bigint("lastReadAt", { mode: "number" }),
  /** Whether user is currently typing */
  isTyping: boolean("isTyping").default(false).notNull(),
  /** When typing status was last updated */
  typingUpdatedAt: bigint("typingUpdatedAt", { mode: "number" }),
  joinedAt: bigint("joinedAt", { mode: "number" }).notNull(),
  leftAt: bigint("leftAt", { mode: "number" }),
}, (table) => ({
  conversationIdx: index("participant_conversation_idx").on(table.conversationId),
  userIdx: index("participant_user_idx").on(table.userId),
  conversationUserIdx: index("participant_conv_user_idx").on(table.conversationId, table.userId),
}));

export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type InsertChatParticipant = typeof chatParticipants.$inferInsert;

/**
 * Chat Messages - Individual messages in conversations
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  senderName: varchar("senderName", { length: 255 }).notNull(),
  senderRole: mysqlEnum("senderRole", ["user", "operator", "admin", "system"]).default("user").notNull(),
  /** Message content */
  content: text("content").notNull(),
  /** Type of message */
  messageType: mysqlEnum("messageType", ["text", "file", "image", "system"]).default("text").notNull(),
  /** Optional file attachment URL */
  attachmentUrl: text("attachmentUrl"),
  attachmentName: varchar("attachmentName", { length: 255 }),
  /** Whether message has been edited */
  isEdited: boolean("isEdited").default(false).notNull(),
  editedAt: bigint("editedAt", { mode: "number" }),
  /** Whether message has been deleted (soft delete) */
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: bigint("deletedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
}, (table) => ({
  conversationIdx: index("message_conversation_idx").on(table.conversationId),
  senderIdx: index("message_sender_idx").on(table.senderId),
  createdAtIdx: index("message_created_at_idx").on(table.createdAt),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * User Online Status - Track when users/operators are online
 */
export const userOnlineStatus = mysqlTable("user_online_status", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  userName: varchar("userName", { length: 255 }).notNull(),
  userRole: mysqlEnum("userRole", ["user", "admin"]).default("user").notNull(),
  /** Whether user is currently online */
  isOnline: boolean("isOnline").default(false).notNull(),
  /** Last activity timestamp */
  lastActivityAt: bigint("lastActivityAt", { mode: "number" }).notNull(),
  /** Current page/module the user is viewing */
  currentPage: varchar("currentPage", { length: 255 }),
  /** Status message (e.g., "Disponível", "Ocupado", "Ausente") */
  statusMessage: varchar("statusMessage", { length: 100 }).default("Disponível"),
}, (table) => ({
  userIdx: index("online_user_idx").on(table.userId),
  onlineIdx: index("online_status_idx").on(table.isOnline),
  roleOnlineIdx: index("online_role_status_idx").on(table.userRole, table.isOnline),
}));

export type UserOnlineStatus = typeof userOnlineStatus.$inferSelect;
export type InsertUserOnlineStatus = typeof userOnlineStatus.$inferInsert;
