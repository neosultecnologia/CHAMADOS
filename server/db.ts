import { eq, desc, and, or, like, sql, gte, lt } from "drizzle-orm";
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
