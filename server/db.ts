import { eq, desc, and, or, like, sql } from "drizzle-orm";
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
  projectComments, InsertProjectComment, ProjectComment
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
