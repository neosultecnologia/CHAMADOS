import { eq, desc, asc, and, or, like, sql, gte, gt, lt, ne, isNull, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, User,
  tickets, InsertTicket, Ticket,
  comments, InsertComment, Comment,
  activities, InsertActivity, Activity,
  attachments, InsertAttachment, Attachment,
  announcements, InsertAnnouncement, Announcement,
  projects, InsertProject, Project,
  projectPhases, InsertProjectPhase, ProjectPhase,
  projectComments, InsertProjectComment, ProjectComment,
  dailyTasks, InsertDailyTask, DailyTask,
  permissionGroups, InsertPermissionGroup, PermissionGroup,
  departments, InsertDepartment, Department,
  suppliers, InsertSupplier, Supplier,
  products, InsertProduct, Product,
  quotations, InsertQuotation, Quotation,
  purchaseOrders, InsertPurchaseOrder, PurchaseOrder,
  purchaseOrderItems, InsertPurchaseOrderItem, PurchaseOrderItem
} from "../drizzle/schema";
import * as schema from "../drizzle/schema";
const purchasingTasks = (schema as any).purchasingTasks;
type PurchasingTask = any;
type InsertPurchasingTask = any;
const kanbanColumnSettings = (schema as any).kanbanColumnSettings;
type KanbanColumnSetting = any;
type InsertKanbanColumnSetting = any;
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function createUser(user: {
  name: string;
  email: string;
  passwordHash: string;
  departmentId?: number;
  groupId?: number;
  role?: 'user' | 'admin';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(users).values({
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      loginMethod: 'internal',
      role: user.role || 'user',
      approvalStatus: user.approvalStatus || 'pending',
      departmentId: user.departmentId,
      groupId: user.groupId,
    });
    
    const insertId = result[0].insertId;
    const created = await db.select().from(users).where(eq(users.id, insertId)).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertOAuthUser(user: {
  openId: string;
  name?: string;
  email?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    if (existingUser.length > 0) {
      // Update existing user
      await db.update(users).set({
        lastSignedIn: new Date(),
        ...(user.name && { name: user.name }),
        ...(user.email && { email: user.email }),
      }).where(eq(users.openId, user.openId));
    } else {
      // Create new OAuth user
      await db.insert(users).values({
        openId: user.openId,
        name: user.name || 'Usuário OAuth',
        email: user.email || `${user.openId}@oauth.local`,
        loginMethod: 'oauth',
        role: user.openId === ENV.ownerOpenId ? 'admin' : 'user',
        approvalStatus: 'approved', // OAuth users are auto-approved
        lastSignedIn: new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert OAuth user:", error);
    throw error;
  }
}

// Legacy function for OAuth compatibility
export async function upsertUser(user: InsertUser): Promise<void> {
  if (user.openId) {
    await upsertOAuthUser({
      openId: user.openId,
      name: user.name || undefined,
      email: user.email || undefined,
    });
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(users.name);
}

export async function getApprovedUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users)
    .where(eq(users.approvalStatus, 'approved'))
    .orderBy(users.name);
}

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users)
    .where(eq(users.approvalStatus, 'pending'))
    .orderBy(desc(users.createdAt));
}

export async function updateUserApprovalStatus(
  id: number, 
  status: 'approved' | 'rejected'
): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(users).set({ approvalStatus: status }).where(eq(users.id, id));
  
  const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : null;
}

export async function updateUserRole(id: number, role: 'user' | 'admin'): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(users).set({ role }).where(eq(users.id, id));
  
  const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : null;
}

export async function updateUserLastSignIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(users).where(eq(users.id, id));
  return result[0].affectedRows > 0;
}

export async function updateUserData(id: number, data: { name?: string; email?: string }): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;

  if (Object.keys(updateData).length === 0) return null;

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, id));

  const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return updated[0] || null;
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, id));

  const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return updated[0] || null;
}

export async function updateUserPermissions(id: number, permissions: string[]): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(users)
    .set({ permissions: permissions as any })
    .where(eq(users.id, id));

  const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return updated[0] || null;
}

// ============ TICKET QUERIES ============

export async function createTicket(ticket: InsertTicket): Promise<Ticket | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(tickets).values(ticket);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(tickets).where(eq(tickets.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getTicketById(id: number): Promise<Ticket | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTicketByTicketId(ticketId: string): Promise<Ticket | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(tickets).where(eq(tickets.ticketId, ticketId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllTickets(filters?: {
  status?: string;
  priority?: string;
  departmentId?: number;
  search?: string;
}): Promise<Ticket[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(tickets);
  
  const conditions = [];
  
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(tickets.status, filters.status as any));
  }
  if (filters?.priority && filters.priority !== 'all') {
    conditions.push(eq(tickets.priority, filters.priority as any));
  }
  if (filters?.departmentId) {
    conditions.push(eq(tickets.departmentId, filters.departmentId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(tickets.title, `%${filters.search}%`),
        like(tickets.description, `%${filters.search}%`),
        like(tickets.ticketId, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query.orderBy(desc(tickets.createdAt));
}

export async function updateTicket(id: number, data: Partial<InsertTicket>): Promise<Ticket | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(tickets).set({
    ...data,
    updatedAt: Date.now(),
  }).where(eq(tickets.id, id));

  return await getTicketById(id);
}

export async function deleteTicket(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Delete related data first
  await db.delete(comments).where(eq(comments.ticketId, id));
  await db.delete(activities).where(eq(activities.ticketId, id));
  await db.delete(attachments).where(eq(attachments.ticketId, id));
  
  const result = await db.delete(tickets).where(eq(tickets.id, id));
  return result[0].affectedRows > 0;
}

export async function getNextTicketNumber(): Promise<number> {
  const db = await getDb();
  if (!db) return 1;

  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(tickets);
  return (result[0]?.count || 0) + 1;
}

// ============ COMMENT QUERIES ============

export async function createComment(comment: InsertComment): Promise<Comment | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(comments).values(comment);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(comments).where(eq(comments.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getCommentsByTicketId(ticketId: number): Promise<Comment[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(comments).where(eq(comments.ticketId, ticketId)).orderBy(desc(comments.createdAt));
}

// ============ ACTIVITY QUERIES ============

export async function createActivity(activity: InsertActivity): Promise<Activity | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(activities).values(activity);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(activities).where(eq(activities.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getActivitiesByTicketId(ticketId: number): Promise<Activity[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(activities).where(eq(activities.ticketId, ticketId)).orderBy(desc(activities.createdAt));
}

// ============ ATTACHMENT QUERIES ============

export async function createAttachment(attachment: InsertAttachment): Promise<Attachment | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(attachments).values(attachment);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(attachments).where(eq(attachments.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getAttachmentsByTicketId(ticketId: number): Promise<Attachment[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(attachments).where(eq(attachments.ticketId, ticketId)).orderBy(desc(attachments.createdAt));
}

export async function deleteAttachment(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(attachments).where(eq(attachments.id, id));
  return result[0].affectedRows > 0;
}

// ============ ANNOUNCEMENT QUERIES ============

export async function createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(announcements).values(announcement);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(announcements).where(eq(announcements.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const db = await getDb();
  if (!db) return [];

  const now = Date.now();
  return await db.select().from(announcements)
    .where(
      and(
        eq(announcements.isActive, 1),
        or(
          sql`${announcements.expiresAt} IS NULL`,
          sql`${announcements.expiresAt} > ${now}`
        )
      )
    )
    .orderBy(desc(announcements.createdAt));
}

export async function updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<Announcement | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(announcements).set(data).where(eq(announcements.id, id));
  
  const updated = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : null;
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(announcements).where(eq(announcements.id, id));
  return result[0].affectedRows > 0;
}

// ============ STATISTICS ============

export async function getTicketStats() {
  const db = await getDb();
  if (!db) return { total: 0, open: 0, inProgress: 0, resolved: 0 };

  const allTickets = await db.select().from(tickets);
  
  return {
    total: allTickets.length,
    open: allTickets.filter(t => t.status === 'Aberto').length,
    inProgress: allTickets.filter(t => t.status === 'Em Progresso').length,
    resolved: allTickets.filter(t => t.status === 'Resolvido' || t.status === 'Fechado').length,
  };
}

// Export db object for tests
export const db = {
  getTickets: getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
};

// ============ PROJECT QUERIES ============

export async function createProject(project: InsertProject): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(projects).values(project);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(projects).where(eq(projects.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getProjectById(id: number): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProjectByProjectId(projectId: string): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(projects).where(eq(projects.projectId, projectId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllProjects(filters?: {
  status?: string;
  priority?: string;
  sector?: string;
  search?: string;
}): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(projects);
  
  const conditions = [];
  
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(projects.status, filters.status as any));
  }
  if (filters?.priority && filters.priority !== 'all') {
    conditions.push(eq(projects.priority, filters.priority as any));
  }
  if (filters?.sector && filters.sector !== 'all') {
    conditions.push(eq(projects.sector, filters.sector as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(projects.name, `%${filters.search}%`),
        like(projects.description, `%${filters.search}%`),
        like(projects.projectId, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query.orderBy(desc(projects.createdAt));
}

export async function updateProject(id: number, data: Partial<InsertProject>): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(projects).set({
    ...data,
    updatedAt: Date.now(),
  }).where(eq(projects.id, id));

  return await getProjectById(id);
}

export async function deleteProject(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Delete related phases first
  await db.delete(projectPhases).where(eq(projectPhases.projectId, id));
  
  const result = await db.delete(projects).where(eq(projects.id, id));
  return result[0].affectedRows > 0;
}

export async function getNextProjectNumber(): Promise<number> {
  const db = await getDb();
  if (!db) return 1;

  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(projects);
  return (result[0]?.count || 0) + 1;
}

// ============ PROJECT PHASE QUERIES ============

export async function createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(projectPhases).values(phase);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(projectPhases).where(eq(projectPhases.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getPhasesByProjectId(projectId: number): Promise<ProjectPhase[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(projectPhases)
    .where(eq(projectPhases.projectId, projectId))
    .orderBy(projectPhases.order);
}

export async function updateProjectPhase(id: number, data: Partial<InsertProjectPhase>): Promise<ProjectPhase | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(projectPhases).set({
    ...data,
    updatedAt: Date.now(),
  }).where(eq(projectPhases.id, id));

  const updated = await db.select().from(projectPhases).where(eq(projectPhases.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : null;
}

export async function deleteProjectPhase(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(projectPhases).where(eq(projectPhases.id, id));
  return result[0].affectedRows > 0;
}

export async function updateProjectProgress(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const phases = await getPhasesByProjectId(projectId);
  if (phases.length === 0) return;

  const completedPhases = phases.filter(p => p.status === 'Concluída').length;
  const progress = Math.round((completedPhases / phases.length) * 100);

  await db.update(projects).set({ progress }).where(eq(projects.id, projectId));
}

// ============ PROJECT COMMENT QUERIES ============

export async function createProjectComment(comment: InsertProjectComment): Promise<ProjectComment | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(projectComments).values(comment);
    const insertId = (result as any)[0]?.insertId;
    if (!insertId) return null;
    const [newComment] = await db.select().from(projectComments).where(eq(projectComments.id, Number(insertId)));
    return newComment || null;
  } catch (error) {
    console.error("[Database] Failed to create project comment:", error);
    return null;
  }
}

export async function getProjectComments(projectId: number): Promise<ProjectComment[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(projectComments).where(eq(projectComments.projectId, projectId)).orderBy(desc(projectComments.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get project comments:", error);
    return [];
  }
}

export async function deleteProjectComment(commentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(projectComments).where(eq(projectComments.id, commentId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete project comment:", error);
    return false;
  }
}

// ============ PROJECT ANALYTICS ============

export async function getProjectAnalytics() {
  const db = await getDb();
  if (!db) return null;

  try {
    const allProjects = await db.select().from(projects);
    const now = Date.now();

    const total = allProjects.length;
    const byStatus = {
      planejamento: allProjects.filter(p => p.status === 'Planejamento').length,
      emAndamento: allProjects.filter(p => p.status === 'Em Andamento').length,
      emPausa: allProjects.filter(p => p.status === 'Em Pausa').length,
      concluido: allProjects.filter(p => p.status === 'Concluído').length,
      cancelado: allProjects.filter(p => p.status === 'Cancelado').length,
    };

    const byPriority = {
      baixa: allProjects.filter(p => p.priority === 'Baixa').length,
      media: allProjects.filter(p => p.priority === 'Média').length,
      alta: allProjects.filter(p => p.priority === 'Alta').length,
      critica: allProjects.filter(p => p.priority === 'Crítica').length,
    };

    // Projects with deadline in next 7 days
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = allProjects.filter(
      p => p.endDate && p.endDate > now && p.endDate <= sevenDaysFromNow && p.status !== 'Concluído'
    );

    // Overdue projects
    const overdue = allProjects.filter(
      p => p.endDate && p.endDate < now && p.status !== 'Concluído' && p.status !== 'Cancelado'
    );

    // Average progress
    const activeProjects = allProjects.filter(
      p => p.status !== 'Concluído' && p.status !== 'Cancelado'
    );
    const avgProgress = activeProjects.length > 0
      ? Math.round(activeProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / activeProjects.length)
      : 0;

    return {
      total,
      byStatus,
      byPriority,
      upcomingDeadlines: upcomingDeadlines.length,
      overdue: overdue.length,
      avgProgress,
      criticalProjects: overdue.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        priority: p.priority,
        endDate: p.endDate,
        progress: p.progress,
      })),
    };
  } catch (error) {
    console.error('[Database] Failed to get project analytics:', error);
    return null;
  }
}

export async function getTodayProjectTasks() {
  const db = await getDb();
  if (!db) return [];

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000);

    // Get phases that should be worked on today (within date range or in progress)
    const phases = await db
      .select({
        id: projectPhases.id,
        name: projectPhases.name,
        status: projectPhases.status,
        projectId: projectPhases.projectId,
        projectName: projects.name,
        startDate: projectPhases.startDate,
        endDate: projectPhases.endDate,
        priority: projects.priority,
      })
      .from(projectPhases)
      .leftJoin(projects, eq(projectPhases.projectId, projects.id))
      .where(
        and(
          eq(projectPhases.status, 'Em Andamento'),
          eq(projects.status, 'Em Andamento')
        )
      );

    return phases;
  } catch (error) {
    console.error('[Database] Failed to get today tasks:', error);
    return [];
  }
}

// ============ DAILY TASKS ============

export async function createDailyTask(task: InsertDailyTask): Promise<DailyTask | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(dailyTasks).values(task);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(dailyTasks).where(eq(dailyTasks.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function getDailyTasksByProjectId(projectId: number): Promise<DailyTask[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(dailyTasks)
    .where(eq(dailyTasks.projectId, projectId))
    .orderBy(desc(dailyTasks.dueDate));
}

export async function getDailyTaskById(id: number): Promise<DailyTask | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTodayDailyTasks(): Promise<DailyTask[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000);

    return await db.select().from(dailyTasks)
      .where(
        and(
          gte(dailyTasks.dueDate, todayStart),
          lt(dailyTasks.dueDate, todayEnd)
        )
      )
      .orderBy(dailyTasks.priority, dailyTasks.dueDate);
  } catch (error) {
    console.error('[Database] Failed to get today daily tasks:', error);
    return [];
  }
}

export async function updateDailyTask(id: number, data: Partial<InsertDailyTask>): Promise<DailyTask | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(dailyTasks).set({
    ...data,
    updatedAt: Date.now(),
  }).where(eq(dailyTasks.id, id));

  return await getDailyTaskById(id);
}

export async function completeDailyTask(id: number): Promise<DailyTask | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(dailyTasks).set({
    status: 'Concluída',
    completedAt: Date.now(),
    updatedAt: Date.now(),
  }).where(eq(dailyTasks.id, id));

  return await getDailyTaskById(id);
}

export async function deleteDailyTask(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
  return result[0].affectedRows > 0;
}

// ============ PERMISSION GROUPS ============

export async function getPermissionGroups(): Promise<PermissionGroup[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(permissionGroups).orderBy(permissionGroups.name);
}

export async function getPermissionGroupById(id: number): Promise<PermissionGroup | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(permissionGroups).where(eq(permissionGroups.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPermissionGroup(group: {
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  isDefault?: boolean;
}): Promise<PermissionGroup | null> {
  const db = await getDb();
  if (!db) return null;

  const now = Date.now();
  const result = await db.insert(permissionGroups).values({
    name: group.name,
    description: group.description || null,
    permissions: group.permissions as any,
    isDefault: group.isDefault || false,
    createdAt: now,
    updatedAt: now,
  });

  const insertId = result[0].insertId;
  return await getPermissionGroupById(Number(insertId));
}

export async function updatePermissionGroup(
  id: number,
  data: {
    name?: string;
    description?: string;
    permissions?: Record<string, boolean>;
    isDefault?: boolean;
  }
): Promise<PermissionGroup | null> {
  const db = await getDb();
  if (!db) return null;

  const updateData: any = {
    ...data,
    updatedAt: Date.now(),
  };

  if (data.permissions) {
    updateData.permissions = data.permissions;
  }

  await db.update(permissionGroups).set(updateData).where(eq(permissionGroups.id, id));
  
  return await getPermissionGroupById(id);
}

export async function deletePermissionGroup(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // First, remove group assignment from users
  await db.update(users).set({ groupId: null }).where(eq(users.groupId, id));

  const result = await db.delete(permissionGroups).where(eq(permissionGroups.id, id));
  return result[0].affectedRows > 0;
}

export async function assignGroupToUser(userId: number, groupId: number | null): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  // If groupId is provided, copy group permissions to user
  if (groupId !== null) {
    const group = await getPermissionGroupById(groupId);
    if (!group) return null;

    await db.update(users).set({
      groupId,
      permissions: group.permissions as any,
    }).where(eq(users.id, userId));
  } else {
    // Remove group assignment
    await db.update(users).set({ groupId: null }).where(eq(users.id, userId));
  }

  const user = await getUserById(userId);
  return user || null;
}

// ============ DEPARTMENT QUERIES ============

export async function createDepartment(data: { name: string; description?: string }): Promise<Department | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(departments).values({
      name: data.name,
      description: data.description,
    });
    
    const insertId = result[0].insertId;
    const created = await db.select().from(departments).where(eq(departments.id, insertId)).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create department:", error);
    throw error;
  }
}

export async function getAllDepartments(): Promise<Department[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(departments).orderBy(departments.name);
}

export async function getDepartmentById(id: number): Promise<Department | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDepartment(id: number, data: { name?: string; description?: string }): Promise<Department | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(departments).set(data).where(eq(departments.id, id));
    return await getDepartmentById(id);
  } catch (error) {
    console.error("[Database] Failed to update department:", error);
    throw error;
  }
}

export async function deleteDepartment(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // First, remove department assignment from users
    await db.update(users).set({ departmentId: null }).where(eq(users.departmentId, id));

    const result = await db.delete(departments).where(eq(departments.id, id));
    return result[0].affectedRows > 0;
  } catch (error) {
    console.error("[Database] Failed to delete department:", error);
    throw error;
  }
}

export async function assignDepartmentToUser(userId: number, departmentId: number | null): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(users).set({ departmentId }).where(eq(users.id, userId));
    const user = await getUserById(userId);
    return user || null;
  } catch (error) {
    console.error("[Database] Failed to assign department to user:", error);
    throw error;
  }
}

// ============ SUPPLIERS ============

export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
}

export async function getSupplierById(id: number): Promise<Supplier | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSupplier(supplier: InsertSupplier): Promise<Supplier | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(suppliers).values(supplier);
  const insertId = result[0].insertId;
  
  return await getSupplierById(insertId);
}

export async function updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(suppliers).set({ ...updates, updatedAt: Date.now() }).where(eq(suppliers.id, id));
  return await getSupplierById(id);
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(suppliers).where(eq(suppliers.id, id));
  return result[0].affectedRows > 0;
}

// ============ PRODUCTS ============

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(products).orderBy(products.name);
}

export async function getProductById(id: number): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createProduct(product: InsertProduct): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(products).values(product);
  const insertId = result[0].insertId;
  
  return await getProductById(insertId);
}

export async function updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(products).set({ ...updates, updatedAt: Date.now() }).where(eq(products.id, id));
  return await getProductById(id);
}

export async function deleteProduct(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(products).where(eq(products.id, id));
  return result[0].affectedRows > 0;
}

// ============ QUOTATIONS ============

export async function getAllQuotations(): Promise<Quotation[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(quotations).orderBy(desc(quotations.createdAt));
}

export async function getQuotationById(id: number): Promise<Quotation | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createQuotation(quotation: InsertQuotation): Promise<Quotation | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(quotations).values(quotation);
  const insertId = result[0].insertId;
  
  return await getQuotationById(insertId);
}

export async function updateQuotation(id: number, updates: Partial<InsertQuotation>): Promise<Quotation | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(quotations).set({ ...updates, updatedAt: Date.now() }).where(eq(quotations.id, id));
  return await getQuotationById(id);
}

// ============ PURCHASE ORDERS ============

export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrder | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(purchaseOrders).values(order);
  const insertId = result[0].insertId;
  
  return await getPurchaseOrderById(insertId);
}

export async function updatePurchaseOrder(id: number, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(purchaseOrders).set({ ...updates, updatedAt: Date.now() }).where(eq(purchaseOrders.id, id));
  return await getPurchaseOrderById(id);
}

// ============ PURCHASE ORDER ITEMS ============

export async function getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
}

export async function createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(purchaseOrderItems).values(item);
  const insertId = result[0].insertId;
  
  const created = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

export async function updatePurchaseOrderItem(id: number, updates: Partial<InsertPurchaseOrderItem>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(purchaseOrderItems).set(updates).where(eq(purchaseOrderItems.id, id));
  return result[0].affectedRows > 0;
}

export async function deletePurchaseOrderItem(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
  return result[0].affectedRows > 0;
}

// ==================== Purchasing Tasks Functions ====================

export async function getAllPurchasingTasks() {
  const db = await getDb();
  return db!.select().from(purchasingTasks).orderBy(purchasingTasks.position);
}

export async function getPurchasingTaskById(id: number) {
  const db = await getDb();
  const result = await db!.select().from(purchasingTasks).where(eq(purchasingTasks.id, id));
  return result[0] || null;
}

export async function createPurchasingTask(data: InsertPurchasingTask) {
  const db = await getDb();
  const result = await db!.insert(purchasingTasks).values(data) as any;
  return result.insertId;
}

export async function updatePurchasingTask(id: number, data: Partial<InsertPurchasingTask>) {
  const db = await getDb();
  await db!.update(purchasingTasks).set(data).where(eq(purchasingTasks.id, id));
}

export async function deletePurchasingTask(id: number) {
  const db = await getDb();
  await db!.delete(purchasingTasks).where(eq(purchasingTasks.id, id));
}

export async function getPurchasingTasksByStatus(status: string) {
  const db = await getDb();
  return db!.select().from(purchasingTasks).where(eq(purchasingTasks.status, status)).orderBy(purchasingTasks.position);
}

// ============================================
// Kanban Column Settings
// ============================================

export async function getKanbanColumnSettings(userId: number, module: string) {
  const db = await getDb();
  return db!.select().from(kanbanColumnSettings)
    .where(and(
      eq(kanbanColumnSettings.userId, userId),
      eq(kanbanColumnSettings.module, module)
    ));
}

export async function upsertKanbanColumnSetting(data: InsertKanbanColumnSetting) {
  const db = await getDb();
  
  // Check if setting exists
  const existing = await db!.select().from(kanbanColumnSettings)
    .where(and(
      eq(kanbanColumnSettings.userId, data.userId),
      eq(kanbanColumnSettings.module, data.module),
      eq(kanbanColumnSettings.columnKey, data.columnKey)
    ));
  
  if (existing.length > 0) {
    // Update existing
    await db!.update(kanbanColumnSettings)
      .set({ customName: data.customName, updatedAt: new Date() })
      .where(and(
        eq(kanbanColumnSettings.userId, data.userId),
        eq(kanbanColumnSettings.module, data.module),
        eq(kanbanColumnSettings.columnKey, data.columnKey)
      ));
  } else {
    // Insert new
    await db!.insert(kanbanColumnSettings).values(data);
  }
}

// ============ NOTIFICATION QUERIES ============

const notifications = (schema as any).notifications;
type Notification = any;
type InsertNotification = any;

export async function createNotification(notification: {
  userId: number;
  type: 'stock_critical' | 'stock_low' | 'request_created' | 'request_updated' | 'request_completed' | 'task_assigned' | 'task_due_soon' | 'system';
  title: string;
  message: string;
  referenceId?: number;
  referenceType?: string;
  actionUrl?: string;
}): Promise<Notification | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(notifications).values({
      ...notification,
      isRead: false,
      createdAt: Date.now(),
    });
    
    const insertId = result[0].insertId;
    const created = await db.select().from(notifications).where(eq(notifications.id, insertId)).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create notification:", error);
    throw error;
  }
}

export async function getNotificationsByUserId(userId: number, options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    let conditions = [eq(notifications.userId, userId)];
    
    if (options?.unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    let query = db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }
    
    return await query;
  } catch (error) {
    console.error("[Database] Failed to get notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Failed to get unread count:", error);
    return 0;
  }
}

export async function markNotificationAsRead(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
    
    return result[0].affectedRows > 0;
  } catch (error) {
    console.error("[Database] Failed to mark notification as read:", error);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to mark all notifications as read:", error);
    return false;
  }
}

export async function deleteNotification(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
    
    return result[0].affectedRows > 0;
  } catch (error) {
    console.error("[Database] Failed to delete notification:", error);
    return false;
  }
}

export async function deleteAllNotifications(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(notifications)
      .where(eq(notifications.userId, userId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete all notifications:", error);
    return false;
  }
}

// ============ STOCK ALERT NOTIFICATIONS ============

export async function checkAndCreateStockAlerts(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get all products with low or critical stock
    const lowStockProducts = await db.select().from(products)
      .where(
        and(
          eq(products.status, 'Ativo'),
          sql`${products.currentStock} <= ${products.minStock}`
        )
      );

    // Get all admin users to notify
    const adminUsers = await db.select().from(users)
      .where(
        and(
          eq(users.role, 'admin'),
          eq(users.approvalStatus, 'approved')
        )
      );

    for (const product of lowStockProducts) {
      const isCritical = product.currentStock === 0;
      const notificationType = isCritical ? 'stock_critical' : 'stock_low';
      const title = isCritical 
        ? `⚠️ Estoque Crítico: ${product.name}`
        : `📦 Estoque Baixo: ${product.name}`;
      const message = isCritical
        ? `O produto "${product.name}" (${product.code}) está com estoque zerado. Ação imediata necessária.`
        : `O produto "${product.name}" (${product.code}) está com estoque baixo (${product.currentStock}/${product.minStock}).`;

      // Create notification for each admin
      for (const admin of adminUsers) {
        // Check if similar notification already exists (avoid duplicates)
        const existing = await db.select().from(notifications)
          .where(
            and(
              eq(notifications.userId, admin.id),
              eq(notifications.type, notificationType),
              eq(notifications.referenceId, product.id),
              eq(notifications.isRead, false)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await createNotification({
            userId: admin.id,
            type: notificationType,
            title,
            message,
            referenceId: product.id,
            referenceType: 'product',
            actionUrl: '/compras/produtos',
          });
        }
      }
    }
  } catch (error) {
    console.error("[Database] Failed to check stock alerts:", error);
  }
}


// ============ CHAT SYSTEM ============

// Import chat tables from schema
const chatConversations = (schema as any).chatConversations;
const chatParticipants = (schema as any).chatParticipants;
const chatMessages = (schema as any).chatMessages;
const userOnlineStatus = (schema as any).userOnlineStatus;

type ChatConversation = any;
type InsertChatConversation = any;
type ChatParticipant = any;
type InsertChatParticipant = any;
type ChatMessage = any;
type InsertChatMessage = any;
type UserOnlineStatus = any;
type InsertUserOnlineStatus = any;

// ============ CONVERSATION QUERIES ============

export async function createConversation(data: {
  ticketId?: number;
  title?: string;
  type: 'ticket_chat' | 'direct_message' | 'support_request';
  createdById: number;
  createdByName: string;
  participantIds: { id: number; name: string; role: 'user' | 'operator' | 'admin' }[];
}): Promise<ChatConversation | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    
    // Create the conversation
    const result = await db.insert(chatConversations).values({
      ticketId: data.ticketId,
      title: data.title,
      type: data.type,
      status: 'active',
      createdById: data.createdById,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
    });

    const conversationId = result[0].insertId;

    // Add creator as participant
    await db.insert(chatParticipants).values({
      conversationId,
      userId: data.createdById,
      userName: data.createdByName,
      role: data.participantIds.find(p => p.id === data.createdById)?.role || 'user',
      joinedAt: now,
    });

    // Add other participants
    for (const participant of data.participantIds) {
      if (participant.id !== data.createdById) {
        await db.insert(chatParticipants).values({
          conversationId,
          userId: participant.id,
          userName: participant.name,
          role: participant.role,
          joinedAt: now,
        });
      }
    }

    // Create system message
    await db.insert(chatMessages).values({
      conversationId,
      senderId: data.createdById,
      senderName: 'Sistema',
      senderRole: 'system',
      content: `Conversa iniciada por ${data.createdByName}`,
      messageType: 'system',
      createdAt: now,
    });

    const created = await db.select().from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);
    
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create conversation:", error);
    return null;
  }
}

export async function getConversationById(id: number): Promise<ChatConversation | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(chatConversations)
      .where(eq(chatConversations.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get conversation:", error);
    return null;
  }
}

export async function getConversationByTicketId(ticketId: number): Promise<ChatConversation | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(chatConversations)
      .where(eq(chatConversations.ticketId, ticketId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get conversation by ticket:", error);
    return null;
  }
}

export async function getUserConversations(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get all conversation IDs where user is a participant
    const participations = await db.select()
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.userId, userId),
          isNull(chatParticipants.leftAt)
        )
      );

    if (participations.length === 0) return [];

    const conversationIds = participations.map(p => p.conversationId);

    // Get conversations with last message and unread count
    const conversations = await db.select()
      .from(chatConversations)
      .where(inArray(chatConversations.id, conversationIds))
      .orderBy(desc(chatConversations.lastMessageAt));

    // Enrich with participant info and unread count
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await db.select()
          .from(chatParticipants)
          .where(
            and(
              eq(chatParticipants.conversationId, conv.id),
              isNull(chatParticipants.leftAt)
            )
          );

        const userParticipation = participations.find(p => p.conversationId === conv.id);
        const lastReadAt = userParticipation?.lastReadAt || 0;

        // Count unread messages
        const unreadResult = await db.select({ count: sql<number>`COUNT(*)` })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversationId, conv.id),
              gt(chatMessages.createdAt, lastReadAt),
              ne(chatMessages.senderId, userId),
              eq(chatMessages.isDeleted, false)
            )
          );

        const unreadCount = unreadResult[0]?.count || 0;

        // Get last message
        const lastMessage = await db.select()
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversationId, conv.id),
              eq(chatMessages.isDeleted, false)
            )
          )
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);

        return {
          ...conv,
          participants,
          unreadCount,
          lastMessage: lastMessage[0] || null,
        };
      })
    );

    return enrichedConversations;
  } catch (error) {
    console.error("[Database] Failed to get user conversations:", error);
    return [];
  }
}

export async function updateConversationStatus(
  id: number,
  status: 'active' | 'waiting' | 'resolved' | 'closed'
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(chatConversations)
      .set({ status, updatedAt: Date.now() })
      .where(eq(chatConversations.id, id));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update conversation status:", error);
    return false;
  }
}

// ============ MESSAGE QUERIES ============

export async function sendMessage(data: {
  conversationId: number;
  senderId: number;
  senderName: string;
  senderRole: 'user' | 'operator' | 'admin';
  content: string;
  messageType?: 'text' | 'file' | 'image';
  attachmentUrl?: string;
  attachmentName?: string;
}): Promise<ChatMessage | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    
    const result = await db.insert(chatMessages).values({
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      content: data.content,
      messageType: data.messageType || 'text',
      attachmentUrl: data.attachmentUrl,
      attachmentName: data.attachmentName,
      createdAt: now,
    });

    // Update conversation lastMessageAt
    await db.update(chatConversations)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(chatConversations.id, data.conversationId));

    const messageId = result[0].insertId;
    const created = await db.select().from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);
    
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to send message:", error);
    return null;
  }
}

export async function getConversationMessages(
  conversationId: number,
  options?: { limit?: number; before?: number }
): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    let conditions = [
      eq(chatMessages.conversationId, conversationId),
      eq(chatMessages.isDeleted, false),
    ];

    if (options?.before) {
      conditions.push(lt(chatMessages.createdAt, options.before));
    }

    let query = db.select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }

    const messages = await query;
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error("[Database] Failed to get messages:", error);
    return [];
  }
}

export async function getNewMessages(
  conversationId: number,
  afterTimestamp: number
): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const messages = await db.select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          gt(chatMessages.createdAt, afterTimestamp),
          eq(chatMessages.isDeleted, false)
        )
      )
      .orderBy(asc(chatMessages.createdAt));

    return messages;
  } catch (error) {
    console.error("[Database] Failed to get new messages:", error);
    return [];
  }
}

export async function markMessagesAsRead(
  conversationId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(chatParticipants)
      .set({ lastReadAt: Date.now() })
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.userId, userId)
        )
      );
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to mark messages as read:", error);
    return false;
  }
}

export async function deleteMessage(
  messageId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.update(chatMessages)
      .set({ isDeleted: true, deletedAt: Date.now() })
      .where(
        and(
          eq(chatMessages.id, messageId),
          eq(chatMessages.senderId, userId)
        )
      );
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete message:", error);
    return false;
  }
}

// ============ TYPING INDICATOR ============

export async function updateTypingStatus(
  conversationId: number,
  userId: number,
  isTyping: boolean
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(chatParticipants)
      .set({ 
        isTyping,
        typingUpdatedAt: Date.now()
      })
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.userId, userId)
        )
      );
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update typing status:", error);
    return false;
  }
}

export async function getTypingUsers(conversationId: number): Promise<{ userId: number; userName: string }[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get users who are typing and updated within last 5 seconds
    const fiveSecondsAgo = Date.now() - 5000;
    
    const typing = await db.select({
      userId: chatParticipants.userId,
      userName: chatParticipants.userName,
    })
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.isTyping, true),
          gt(chatParticipants.typingUpdatedAt, fiveSecondsAgo)
        )
      );

    return typing;
  } catch (error) {
    console.error("[Database] Failed to get typing users:", error);
    return [];
  }
}

// ============ ONLINE STATUS ============

export async function updateUserOnlineStatus(data: {
  userId: number;
  userName: string;
  userRole: 'user' | 'admin';
  isOnline: boolean;
  currentPage?: string;
  statusMessage?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Try to update existing record
    const existing = await db.select().from(userOnlineStatus)
      .where(eq(userOnlineStatus.userId, data.userId))
      .limit(1);

    if (existing.length > 0) {
      await db.update(userOnlineStatus)
        .set({
          isOnline: data.isOnline,
          lastActivityAt: Date.now(),
          currentPage: data.currentPage,
          statusMessage: data.statusMessage || 'Disponível',
        })
        .where(eq(userOnlineStatus.userId, data.userId));
    } else {
      await db.insert(userOnlineStatus).values({
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole,
        isOnline: data.isOnline,
        lastActivityAt: Date.now(),
        currentPage: data.currentPage,
        statusMessage: data.statusMessage || 'Disponível',
      });
    }
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update online status:", error);
    return false;
  }
}

export async function getOnlineOperators(): Promise<UserOnlineStatus[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Consider users online if they were active in the last 2 minutes
    const twoMinutesAgo = Date.now() - 120000;
    
    const operators = await db.select()
      .from(userOnlineStatus)
      .where(
        and(
          eq(userOnlineStatus.userRole, 'admin'),
          eq(userOnlineStatus.isOnline, true),
          gt(userOnlineStatus.lastActivityAt, twoMinutesAgo)
        )
      );

    return operators;
  } catch (error) {
    console.error("[Database] Failed to get online operators:", error);
    return [];
  }
}

export async function getAllOnlineUsers(): Promise<UserOnlineStatus[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const twoMinutesAgo = Date.now() - 120000;
    
    const users = await db.select()
      .from(userOnlineStatus)
      .where(
        and(
          eq(userOnlineStatus.isOnline, true),
          gt(userOnlineStatus.lastActivityAt, twoMinutesAgo)
        )
      );

    return users;
  } catch (error) {
    console.error("[Database] Failed to get online users:", error);
    return [];
  }
}

// ============ PARTICIPANT QUERIES ============

export async function addParticipantToConversation(data: {
  conversationId: number;
  userId: number;
  userName: string;
  role: 'user' | 'operator' | 'admin';
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if already a participant
    const existing = await db.select().from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.conversationId, data.conversationId),
          eq(chatParticipants.userId, data.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Rejoin if previously left
      if (existing[0].leftAt) {
        await db.update(chatParticipants)
          .set({ leftAt: null, joinedAt: Date.now() })
          .where(eq(chatParticipants.id, existing[0].id));
      }
      return true;
    }

    await db.insert(chatParticipants).values({
      conversationId: data.conversationId,
      userId: data.userId,
      userName: data.userName,
      role: data.role,
      joinedAt: Date.now(),
    });

    // Add system message
    await db.insert(chatMessages).values({
      conversationId: data.conversationId,
      senderId: data.userId,
      senderName: 'Sistema',
      senderRole: 'system',
      content: `${data.userName} entrou na conversa`,
      messageType: 'system',
      createdAt: Date.now(),
    });
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to add participant:", error);
    return false;
  }
}

export async function removeParticipantFromConversation(
  conversationId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(chatParticipants)
      .set({ leftAt: Date.now() })
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          eq(chatParticipants.userId, userId)
        )
      );
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to remove participant:", error);
    return false;
  }
}

export async function getConversationParticipants(conversationId: number): Promise<ChatParticipant[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const participants = await db.select()
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.conversationId, conversationId),
          isNull(chatParticipants.leftAt)
        )
      );

    return participants;
  } catch (error) {
    console.error("[Database] Failed to get participants:", error);
    return [];
  }
}


// ============ CHAT QUEUE FUNCTIONS ============

const chatQueue = (schema as any).chatQueue;
type ChatQueue = any;
const operatorAvailability = (schema as any).operatorAvailability;
type OperatorAvailability = any;

/**
 * Add user to chat queue
 */
export async function addToQueue(data: {
  userId: number;
  userName: string;
  ticketId?: number;
  initialMessage?: string;
  priority?: 'normal' | 'high' | 'urgent';
}): Promise<ChatQueue | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if user is already in queue
    const existing = await db.select().from(chatQueue)
      .where(
        and(
          eq(chatQueue.userId, data.userId),
          inArray(chatQueue.status, ['waiting', 'assigned'])
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0]; // Already in queue
    }

    // Get next position
    const lastInQueue = await db.select({ maxPos: sql<number>`MAX(position)` })
      .from(chatQueue)
      .where(eq(chatQueue.status, 'waiting'));
    
    const nextPosition = (lastInQueue[0]?.maxPos || 0) + 1;

    const result = await db.insert(chatQueue).values({
      userId: data.userId,
      userName: data.userName,
      ticketId: data.ticketId,
      position: nextPosition,
      status: 'waiting',
      initialMessage: data.initialMessage,
      priority: data.priority || 'normal',
      enteredAt: Date.now(),
    });

    const queueId = result[0].insertId;
    const created = await db.select().from(chatQueue)
      .where(eq(chatQueue.id, queueId))
      .limit(1);

    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to add to queue:", error);
    return null;
  }
}

/**
 * Get current queue status for a user
 */
export async function getUserQueueStatus(userId: number): Promise<ChatQueue | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const status = await db.select().from(chatQueue)
      .where(
        and(
          eq(chatQueue.userId, userId),
          inArray(chatQueue.status, ['waiting', 'assigned', 'in_progress'])
        )
      )
      .orderBy(desc(chatQueue.enteredAt))
      .limit(1);

    return status.length > 0 ? status[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get user queue status:", error);
    return null;
  }
}

/**
 * Get all users waiting in queue (for operators)
 */
export async function getWaitingQueue(): Promise<ChatQueue[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const queue = await db.select().from(chatQueue)
      .where(eq(chatQueue.status, 'waiting'))
      .orderBy(
        desc(chatQueue.priority), // urgent first
        asc(chatQueue.position)   // then by position
      );

    return queue;
  } catch (error) {
    console.error("[Database] Failed to get waiting queue:", error);
    return [];
  }
}

/**
 * Get queue position for a user
 */
export async function getQueuePosition(userId: number): Promise<{ position: number; total: number } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const userQueue = await db.select().from(chatQueue)
      .where(
        and(
          eq(chatQueue.userId, userId),
          eq(chatQueue.status, 'waiting')
        )
      )
      .limit(1);

    if (userQueue.length === 0) return null;

    const userPosition = userQueue[0].position;

    // Count how many are ahead
    const ahead = await db.select({ count: sql<number>`COUNT(*)` })
      .from(chatQueue)
      .where(
        and(
          eq(chatQueue.status, 'waiting'),
          lt(chatQueue.position, userPosition)
        )
      );

    const total = await db.select({ count: sql<number>`COUNT(*)` })
      .from(chatQueue)
      .where(eq(chatQueue.status, 'waiting'));

    return {
      position: (ahead[0]?.count || 0) + 1,
      total: total[0]?.count || 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get queue position:", error);
    return null;
  }
}

/**
 * Accept a chat from queue (operator action)
 */
export async function acceptChatFromQueue(
  queueId: number,
  operatorId: number,
  operatorName: string
): Promise<{ queue: ChatQueue; conversation: ChatConversation } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get queue entry
    const queueEntry = await db.select().from(chatQueue)
      .where(eq(chatQueue.id, queueId))
      .limit(1);

    if (queueEntry.length === 0 || queueEntry[0].status !== 'waiting') {
      return null;
    }

    const entry = queueEntry[0];
    const now = Date.now();

    // Create conversation
    const convResult = await db.insert(chatConversations).values({
      ticketId: entry.ticketId,
      title: entry.initialMessage?.substring(0, 50) || 'Chat de Suporte',
      type: 'support_request',
      status: 'active',
      createdById: entry.userId,
      createdByName: entry.userName,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const conversationId = convResult[0].insertId;

    // Add participants
    await db.insert(chatParticipants).values([
      {
        conversationId,
        userId: entry.userId,
        userName: entry.userName,
        role: 'user',
        joinedAt: now,
      },
      {
        conversationId,
        userId: operatorId,
        userName: operatorName,
        role: 'operator',
        joinedAt: now,
      },
    ]);

    // Add system message
    await db.insert(chatMessages).values({
      conversationId,
      senderId: operatorId,
      senderName: 'Sistema',
      senderRole: 'system',
      content: `${operatorName} aceitou o atendimento`,
      messageType: 'system',
      createdAt: now,
    });

    // Update queue entry
    await db.update(chatQueue)
      .set({
        status: 'in_progress',
        conversationId,
        assignedOperatorId: operatorId,
        assignedOperatorName: operatorName,
        acceptedAt: now,
      })
      .where(eq(chatQueue.id, queueId));

    // Update operator active chats count
    await db.update(operatorAvailability)
      .set({
        currentActiveChats: sql`currentActiveChats + 1`,
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(eq(operatorAvailability.operatorId, operatorId));

    // Get updated records
    const updatedQueue = await db.select().from(chatQueue)
      .where(eq(chatQueue.id, queueId))
      .limit(1);

    const conversation = await db.select().from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    return {
      queue: updatedQueue[0],
      conversation: conversation[0],
    };
  } catch (error) {
    console.error("[Database] Failed to accept chat from queue:", error);
    return null;
  }
}

/**
 * Complete/close a chat from queue
 */
export async function completeChatFromQueue(queueId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const queueEntry = await db.select().from(chatQueue)
      .where(eq(chatQueue.id, queueId))
      .limit(1);

    if (queueEntry.length === 0) return false;

    const entry = queueEntry[0];
    const now = Date.now();

    // Update queue
    await db.update(chatQueue)
      .set({
        status: 'completed',
        completedAt: now,
      })
      .where(eq(chatQueue.id, queueId));

    // Update conversation if exists
    if (entry.conversationId) {
      await db.update(chatConversations)
        .set({ status: 'resolved', updatedAt: now })
        .where(eq(chatConversations.id, entry.conversationId));
    }

    // Decrease operator active chats
    if (entry.assignedOperatorId) {
      await db.update(operatorAvailability)
        .set({
          currentActiveChats: sql`GREATEST(currentActiveChats - 1, 0)`,
          updatedAt: now,
        })
        .where(eq(operatorAvailability.operatorId, entry.assignedOperatorId));
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to complete chat from queue:", error);
    return false;
  }
}

/**
 * Cancel queue entry (user leaves queue)
 */
export async function cancelQueueEntry(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(chatQueue)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(chatQueue.userId, userId),
          eq(chatQueue.status, 'waiting')
        )
      );

    return true;
  } catch (error) {
    console.error("[Database] Failed to cancel queue entry:", error);
    return false;
  }
}

// ============ OPERATOR AVAILABILITY FUNCTIONS ============

/**
 * Update operator availability
 */
export async function updateOperatorAvailability(data: {
  operatorId: number;
  operatorName: string;
  isAvailableForChat: boolean;
  status?: 'available' | 'busy' | 'away' | 'offline';
  maxConcurrentChats?: number;
  statusMessage?: string;
}): Promise<OperatorAvailability | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    
    // Check if record exists
    const existing = await db.select().from(operatorAvailability)
      .where(eq(operatorAvailability.operatorId, data.operatorId))
      .limit(1);

    if (existing.length > 0) {
      await db.update(operatorAvailability)
        .set({
          operatorName: data.operatorName,
          isAvailableForChat: data.isAvailableForChat,
          status: data.status || (data.isAvailableForChat ? 'available' : 'offline'),
          maxConcurrentChats: data.maxConcurrentChats ?? existing[0].maxConcurrentChats,
          statusMessage: data.statusMessage,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(operatorAvailability.operatorId, data.operatorId));
    } else {
      await db.insert(operatorAvailability).values({
        operatorId: data.operatorId,
        operatorName: data.operatorName,
        isAvailableForChat: data.isAvailableForChat,
        status: data.status || (data.isAvailableForChat ? 'available' : 'offline'),
        maxConcurrentChats: data.maxConcurrentChats || 3,
        currentActiveChats: 0,
        statusMessage: data.statusMessage,
        lastActiveAt: now,
        updatedAt: now,
      });
    }

    const updated = await db.select().from(operatorAvailability)
      .where(eq(operatorAvailability.operatorId, data.operatorId))
      .limit(1);

    return updated.length > 0 ? updated[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update operator availability:", error);
    return null;
  }
}

/**
 * Get all operators with their availability status
 */
export async function getAllOperatorsAvailability(): Promise<OperatorAvailability[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const operators = await db.select().from(operatorAvailability)
      .orderBy(
        desc(operatorAvailability.isAvailableForChat),
        asc(operatorAvailability.currentActiveChats)
      );

    return operators;
  } catch (error) {
    console.error("[Database] Failed to get operators availability:", error);
    return [];
  }
}

/**
 * Get available operators (can accept new chats)
 */
export async function getAvailableOperators(): Promise<OperatorAvailability[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const operators = await db.select().from(operatorAvailability)
      .where(
        and(
          eq(operatorAvailability.isAvailableForChat, true),
          eq(operatorAvailability.status, 'available'),
          sql`currentActiveChats < maxConcurrentChats`
        )
      )
      .orderBy(asc(operatorAvailability.currentActiveChats));

    return operators;
  } catch (error) {
    console.error("[Database] Failed to get available operators:", error);
    return [];
  }
}

/**
 * Get operator stats summary
 */
export async function getOperatorStats(): Promise<{
  available: number;
  busy: number;
  away: number;
  offline: number;
  totalInQueue: number;
}> {
  const db = await getDb();
  if (!db) return { available: 0, busy: 0, away: 0, offline: 0, totalInQueue: 0 };

  try {
    const stats = await db.select({
      status: operatorAvailability.status,
      count: sql<number>`COUNT(*)`,
    })
      .from(operatorAvailability)
      .groupBy(operatorAvailability.status);

    const queueCount = await db.select({ count: sql<number>`COUNT(*)` })
      .from(chatQueue)
      .where(eq(chatQueue.status, 'waiting'));

    const result = {
      available: 0,
      busy: 0,
      away: 0,
      offline: 0,
      totalInQueue: queueCount[0]?.count || 0,
    };

    stats.forEach((s) => {
      if (s.status in result) {
        (result as any)[s.status] = s.count;
      }
    });

    return result;
  } catch (error) {
    console.error("[Database] Failed to get operator stats:", error);
    return { available: 0, busy: 0, away: 0, offline: 0, totalInQueue: 0 };
  }
}

/**
 * Get operator's active chats
 */
export async function getOperatorActiveChats(operatorId: number): Promise<ChatQueue[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const chats = await db.select().from(chatQueue)
      .where(
        and(
          eq(chatQueue.assignedOperatorId, operatorId),
          eq(chatQueue.status, 'in_progress')
        )
      )
      .orderBy(desc(chatQueue.acceptedAt));

    return chats;
  } catch (error) {
    console.error("[Database] Failed to get operator active chats:", error);
    return [];
  }
}
