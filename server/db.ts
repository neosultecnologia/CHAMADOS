import { eq, desc, and, or, like, sql, gte, lt, gt, asc } from "drizzle-orm";
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
  stockItems, InsertStockItem, StockItem,
  stockMovements, InsertStockMovement, StockMovement,
  stockRequests, InsertStockRequest, StockRequest
} from "../drizzle/schema";
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
  sector?: string;
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
      sector: (user.sector as any) || 'Outro',
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
  // Permissions are no longer stored in users table
  // This function is kept for backwards compatibility but does nothing
  const db = await getDb();
  if (!db) return null;

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

export async function getTicketCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select().from(tickets);
  return result.length;
}

export async function getAllTickets(filters?: {
  status?: string;
  priority?: string;
  sector?: string;
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
  if (filters?.sector && filters.sector !== 'all') {
    conditions.push(eq(tickets.sector, filters.sector as any));
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

  // GroupId is no longer used, just delete the permission group
  const result = await db.delete(permissionGroups).where(eq(permissionGroups.id, id));
  return result[0].affectedRows > 0;
}

export async function assignGroupToUser(userId: number, groupId: number | null): Promise<User | null> {
  // GroupId is no longer stored in users table
  // This function is kept for backwards compatibility but does nothing
  const user = await getUserById(userId);
  return user || null;
}

// ============================================
// Stock Management
// ============================================

export async function getAllStockItems() {
  const db = await getDb();
  return db!.select().from(stockItems).orderBy(desc(stockItems.createdAt));
}

export async function getStockItemById(id: number) {
  const db = await getDb();
  const result = await db!.select().from(stockItems).where(eq(stockItems.id, id));
  return result[0];
}

export async function getAvailableStockItems() {
  const db = await getDb();
  return db!.select().from(stockItems)
    .where(and(
      eq(stockItems.status, "Disponível"),
      gt(stockItems.quantity, 0)
    ))
    .orderBy(desc(stockItems.createdAt));
}

export async function getLowStockItems() {
  const db = await getDb();
  return db!.select().from(stockItems)
    .where(sql`${stockItems.quantity} <= ${stockItems.minQuantity}`)
    .orderBy(asc(stockItems.quantity));
}

export async function createStockItem(data: InsertStockItem) {
  const db = await getDb();
  const result = await db!.insert(stockItems).values(data);
  return result[0].insertId;
}

export async function updateStockItem(id: number, data: Partial<InsertStockItem>) {
  const db = await getDb();
  await db!.update(stockItems).set(data).where(eq(stockItems.id, id));
}

export async function deleteStockItem(id: number) {
  const db = await getDb();
  await db!.delete(stockItems).where(eq(stockItems.id, id));
}

export async function updateStockQuantity(id: number, newQuantity: number) {
  const db = await getDb();
  await db!.update(stockItems).set({ 
    quantity: newQuantity,
    updatedAt: Date.now()
  }).where(eq(stockItems.id, id));
}

// Stock Movements
export async function createStockMovement(data: InsertStockMovement) {
  const db = await getDb();
  const result = await db!.insert(stockMovements).values(data);
  return result[0].insertId;
}

export async function getStockMovementsByItem(stockItemId: number) {
  const db = await getDb();
  return db!.select().from(stockMovements)
    .where(eq(stockMovements.stockItemId, stockItemId))
    .orderBy(desc(stockMovements.createdAt));
}

export async function getAllStockMovements() {
  const db = await getDb();
  return db!.select().from(stockMovements)
    .orderBy(desc(stockMovements.createdAt))
    .limit(100); // Last 100 movements
}

// Stock Requests
export async function createStockRequest(data: InsertStockRequest) {
  const db = await getDb();
  const result = await db!.insert(stockRequests).values(data);
  return result[0].insertId;
}

export async function getStockRequestById(id: number) {
  const db = await getDb();
  const result = await db!.select().from(stockRequests).where(eq(stockRequests.id, id));
  return result[0];
}

export async function getAllStockRequests() {
  const db = await getDb();
  return db!.select().from(stockRequests)
    .orderBy(desc(stockRequests.createdAt));
}

export async function getStockRequestsByUser(userId: number) {
  const db = await getDb();
  return db!.select().from(stockRequests)
    .where(eq(stockRequests.requestedById, userId))
    .orderBy(desc(stockRequests.createdAt));
}

export async function getPendingStockRequests() {
  const db = await getDb();
  return db!.select().from(stockRequests)
    .where(eq(stockRequests.status, "Pendente"))
    .orderBy(desc(stockRequests.createdAt));
}

export async function updateStockRequest(id: number, data: Partial<InsertStockRequest>) {
  const db = await getDb();
  await db!.update(stockRequests).set(data).where(eq(stockRequests.id, id));
}

export async function approveStockRequest(id: number, approvedById: number, approvedByName: string) {
  const db = await getDb();
  await db!.update(stockRequests).set({
    status: "Aprovado",
    approvedById,
    approvedByName,
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  }).where(eq(stockRequests.id, id));
}

export async function rejectStockRequest(id: number, approvedById: number, approvedByName: string) {
  const db = await getDb();
  await db!.update(stockRequests).set({
    status: "Rejeitado",
    approvedById,
    approvedByName,
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  }).where(eq(stockRequests.id, id));
}

export async function markStockRequestDelivered(id: number) {
  const db = await getDb();
  await db!.update(stockRequests).set({
    status: "Entregue",
    deliveredAt: Date.now(),
    updatedAt: Date.now(),
  }).where(eq(stockRequests.id, id));
}
