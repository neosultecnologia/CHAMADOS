import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";
import { hasModulePermission, MODULES, ACTIONS } from "@shared/permissions";
import { requirePermission } from "./permissionMiddleware";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      
      // If user has a groupId, merge group permissions with user permissions
      if (ctx.user.groupId) {
        const group = await db.getPermissionGroupById(ctx.user.groupId);
        if (group) {
          // Parse both permissions
          const userPerms = typeof ctx.user.permissions === 'string' 
            ? JSON.parse(ctx.user.permissions) 
            : ctx.user.permissions || {};
          const groupPerms = typeof group.permissions === 'string'
            ? JSON.parse(group.permissions)
            : group.permissions || {};
          
          // Merge: group permissions as base, user permissions override
          const mergedPermissions = { ...groupPerms, ...userPerms };
          
          return {
            ...ctx.user,
            permissions: mergedPermissions
          };
        }
      }
      
      return ctx.user;
    }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Internal login with email/password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha inválidos",
          });
        }

        const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValidPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email ou senha inválidos",
          });
        }

        if (user.approvalStatus === "pending") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sua conta está aguardando aprovação do administrador",
          });
        }

        if (user.approvalStatus === "rejected") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sua conta foi rejeitada. Entre em contato com o administrador.",
          });
        }

        // Update last sign in
        await db.updateUserLastSignIn(user.id);

        // Create session token using internal user ID
        const sessionToken = await sdk.createInternalSessionToken(user.id, user.name || "Usuário");
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user };
      }),

    // Register new user
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        departmentId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este email já está cadastrado",
          });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Create user with pending status
        const user = await db.createUser({
          name: input.name,
          email: input.email,
          passwordHash,
          departmentId: input.departmentId,
          approvalStatus: "pending",
        });

        return { 
          success: true, 
          message: "Cadastro realizado com sucesso! Aguarde a aprovação do administrador." 
        };
      }),
  }),

  // ============ USER MANAGEMENT (Admin) ============
  userManagement: router({
    listPending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return await db.getPendingUsers();
    }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return await db.getAllUsers();
    }),

    createUser: protectedProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        departmentId: z.number().optional(),
        groupId: z.number().optional(),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }

        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este email já está cadastrado",
          });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Create user with approved status (admin-created users are auto-approved)
        const user = await db.createUser({
          name: input.name,
          email: input.email,
          passwordHash,
          departmentId: input.departmentId,
          groupId: input.groupId,
          role: input.role,
          approvalStatus: "approved",
        });

        return user;
      }),

    approve: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        return await db.updateUserApprovalStatus(input.userId, "approved");
      }),

    reject: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        return await db.updateUserApprovalStatus(input.userId, "rejected");
      }),

    updateRole: protectedProcedure
      .input(z.object({ 
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        return await db.updateUserRole(input.userId, input.role);
      }),

    delete: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        // Prevent self-deletion
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode excluir sua própria conta" });
        }
        return await db.deleteUser(input.userId);
      }),

    updateUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }

        // Check if email already exists (if changing email)
        if (input.email) {
          const existingUser = await db.getUserByEmail(input.email);
          if (existingUser && existingUser.id !== input.userId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Este email já está cadastrado",
            });
          }
        }

        return await db.updateUserData(input.userId, {
          name: input.name,
          email: input.email,
        });
      }),

    resetPassword: protectedProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        return await db.updateUserPassword(input.userId, passwordHash);
      }),
  }),

  // ============ TICKETS ============
  tickets: router({
    list: protectedProcedure
      .use(requirePermission(MODULES.CHAMADOS, ACTIONS.READ))
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        departmentId: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        // Admins see all tickets, regular users see only their own
        const isAdmin = ctx.user?.role === 'admin';
        return await db.getAllTickets({
          ...input,
          creatorId: isAdmin ? undefined : ctx.user?.id,
        });
      }),

    getById: protectedProcedure
      .use(requirePermission(MODULES.CHAMADOS, ACTIONS.READ))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTicketById(input.id);
      }),

    getByTicketId: protectedProcedure
      .use(requirePermission(MODULES.CHAMADOS, ACTIONS.READ))
      .input(z.object({ ticketId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTicketByTicketId(input.ticketId);
      }),

    create: protectedProcedure
      .use(requirePermission(MODULES.CHAMADOS, ACTIONS.CREATE))
      .input(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        category: z.enum(["Técnico", "Acesso", "Funcionalidade", "Dúvida", "Outro"]),
        priority: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
        departmentId: z.number().optional(),
        assignedToId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const nextNumber = await db.getNextTicketNumber();
        const ticketId = `bilhete_${nextNumber}`;
        const now = Date.now();

        // Get assigned user name if assignedToId is provided
        let assignedToName = null;
        if (input.assignedToId) {
          const assignedUser = await db.getUserById(input.assignedToId);
          assignedToName = assignedUser?.name || null;
        }

        const ticket = await db.createTicket({
          ticketId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          departmentId: input.departmentId,
          status: "Aberto",
          createdById: ctx.user.id,
          createdByName: ctx.user.name || "Usuário",
          assignedToId: input.assignedToId,
          assignedToName,
          createdAt: now,
          updatedAt: now,
        });

        if (ticket) {
          // Create initial activity
          await db.createActivity({
            ticketId: ticket.id,
            type: "created",
            authorId: ctx.user.id,
            authorName: ctx.user.name || "Usuário",
            description: `Chamado criado por ${ctx.user.name || "Usuário"}`,
            createdAt: now,
          });
        }

        return ticket;
      }),

    update: protectedProcedure
      .use(requirePermission(MODULES.CHAMADOS, ACTIONS.UPDATE))
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["Técnico", "Acesso", "Funcionalidade", "Dúvida", "Outro"]).optional(),
        priority: z.enum(["Baixa", "Média", "Alta", "Crítica"]).optional(),
        status: z.enum(["Aberto", "Em Progresso", "Aguardando", "Resolvido", "Fechado"]).optional(),
        departmentId: z.number().nullable().optional(),
        assignedToId: z.number().nullable().optional(),
        assignedToName: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updateData } = input;
        const oldTicket = await db.getTicketById(id);
        
        if (!oldTicket) {
          throw new Error("Ticket not found");
        }

        const now = Date.now();

        // Track changes for activity feed
        if (input.status && input.status !== oldTicket.status) {
          await db.createActivity({
            ticketId: id,
            type: "status_change",
            authorId: ctx.user.id,
            authorName: ctx.user.name || "Usuário",
            oldValue: oldTicket.status,
            newValue: input.status,
            description: `Status alterado de "${oldTicket.status}" para "${input.status}"`,
            createdAt: now,
          });
        }

        if (input.priority && input.priority !== oldTicket.priority) {
          await db.createActivity({
            ticketId: id,
            type: "priority_change",
            authorId: ctx.user.id,
            authorName: ctx.user.name || "Usuário",
            oldValue: oldTicket.priority,
            newValue: input.priority,
            description: `Prioridade alterada de "${oldTicket.priority}" para "${input.priority}"`,
            createdAt: now,
          });
        }

        if (input.departmentId !== undefined && input.departmentId !== oldTicket.departmentId) {
          const oldDept = oldTicket.departmentId ? await db.getDepartmentById(oldTicket.departmentId) : null;
          const newDept = input.departmentId ? await db.getDepartmentById(input.departmentId) : null;
          await db.createActivity({
            ticketId: id,
            type: "sector_change",
            authorId: ctx.user.id,
            authorName: ctx.user.name || "Usuário",
            oldValue: oldDept?.name || "Sem setor",
            newValue: newDept?.name || "Sem setor",
            description: `Setor alterado de "${oldDept?.name || "Sem setor"}" para "${newDept?.name || "Sem setor"}"`,
            createdAt: now,
          });
        }

        if (input.assignedToName !== undefined && input.assignedToName !== oldTicket.assignedToName) {
          await db.createActivity({
            ticketId: id,
            type: "assignment",
            authorId: ctx.user.id,
            authorName: ctx.user.name || "Usuário",
            oldValue: oldTicket.assignedToName || "Não atribuído",
            newValue: input.assignedToName || "Não atribuído",
            description: `Responsável alterado para "${input.assignedToName || "Não atribuído"}"`,
            createdAt: now,
          });
        }

        return await db.updateTicket(id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can delete tickets
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem excluir chamados",
          });
        }
        
        return await db.deleteTicket(input.id);
      }),

    stats: protectedProcedure.query(async () => {
      return await db.getTicketStats();
    }),
  }),

  // ============ COMMENTS ============
  comments: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCommentsByTicketId(input.ticketId);
      }),

    create: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const now = Date.now();

        const comment = await db.createComment({
          ticketId: input.ticketId,
          authorId: ctx.user.id,
          authorName: ctx.user.name || "Usuário",
          content: input.content,
          createdAt: now,
        });

        // Create activity for comment
        await db.createActivity({
          ticketId: input.ticketId,
          type: "comment",
          authorId: ctx.user.id,
          authorName: ctx.user.name || "Usuário",
          description: `Comentário adicionado por ${ctx.user.name || "Usuário"}`,
          createdAt: now,
        });

        return comment;
      }),
  }),

  // ============ ACTIVITIES ============
  activities: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        return await db.getActivitiesByTicketId(input.ticketId);
      }),
  }),

  // ============ ATTACHMENTS ============
  attachments: router({
    list: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAttachmentsByTicketId(input.ticketId);
      }),

    create: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createAttachment({
          ticketId: input.ticketId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          mimeType: input.mimeType || null,
          fileSize: input.fileSize || null,
          uploadedById: ctx.user.id,
          uploadedByName: ctx.user.name || "Usuário",
          createdAt: Date.now(),
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteAttachment(input.id);
      }),
  }),

  // ============ ANNOUNCEMENTS ============
  announcements: router({
    list: protectedProcedure.query(async () => {
      return await db.getActiveAnnouncements();
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        type: z.enum(["info", "warning", "success", "error"]),
        expiresAt: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createAnnouncement({
          title: input.title,
          content: input.content || null,
          type: input.type,
          isActive: 1,
          createdById: ctx.user.id,
          createdAt: Date.now(),
          expiresAt: input.expiresAt || null,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        type: z.enum(["info", "warning", "success", "error"]).optional(),
        isActive: z.number().optional(),
        expiresAt: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateAnnouncement(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteAnnouncement(input.id);
      }),
  }),

  // ============ PROJECTS ============
  projects: router({
    list: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.READ))
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        sector: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getAllProjects(input || {});
      }),

    getById: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.READ))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.CREATE))
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
        sector: z.enum(["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações"]),
        ownerId: z.number(),
        ownerName: z.string(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const projectNumber = await db.getNextProjectNumber();
        const projectId = `proj_${projectNumber}`;

        return await db.createProject({
          projectId,
          name: input.name,
          description: input.description || null,
          status: "Planejamento",
          priority: input.priority,
          ownerId: input.ownerId,
          ownerName: input.ownerName,
          sector: input.sector,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          progress: 0,
          createdById: ctx.user.id,
          createdByName: ctx.user.name || "Usuário",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }),

    update: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.UPDATE))
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["Planejamento", "Em Andamento", "Em Pausa", "Concluído", "Cancelado"]).optional(),
        priority: z.enum(["Baixa", "Média", "Alta", "Crítica"]).optional(),
        ownerId: z.number().optional(),
        ownerName: z.string().optional(),
        departmentId: z.number().nullable().optional(),
        startDate: z.number().nullable().optional(),
        endDate: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateProject(id, data);
      }),

    delete: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.DELETE))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Get project to check status
        const project = await db.getProjectById(input.id);
        
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Projeto não encontrado",
          });
        }

        // Only allow deletion of non-completed projects
        if (project.status === "Concluído") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível excluir projetos concluídos",
          });
        }

        const success = await db.deleteProject(input.id);
        
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao excluir projeto",
          });
        }

        return { success: true };
      }),

    // Dashboard analytics
    getAnalytics: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.READ))
      .query(async () => {
        return await db.getProjectAnalytics();
      }),

    getTodayTasks: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.READ))
      .query(async () => {
        return await db.getTodayProjectTasks();
      }),
  }),

  // ============ PROJECT PHASES ============
  projectPhases: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPhasesByProjectId(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        order: z.number(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const phase = await db.createProjectPhase({
          projectId: input.projectId,
          name: input.name,
          description: input.description || null,
          status: "Pendente",
          order: input.order,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          completedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Update project progress
        await db.updateProjectProgress(input.projectId);

        return phase;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["Pendente", "Em Andamento", "Concluída", "Atrasada"]).optional(),
        order: z.number().optional(),
        startDate: z.number().nullable().optional(),
        endDate: z.number().nullable().optional(),
        completedAt: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, projectId, ...data } = input;
        const phase = await db.updateProjectPhase(id, data);

        // Update project progress
        await db.updateProjectProgress(projectId);

        return phase;
      }),

    delete: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        projectId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.deleteProjectPhase(input.id);

        // Update project progress
        await db.updateProjectProgress(input.projectId);

        return result;
      }),
  }),

  // ============ PROJECT COMMENTS ============
  projectComments: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectComments(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        content: z.string().min(1),
        mentions: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createProjectComment({
          projectId: input.projectId,
          authorId: ctx.user.id,
          authorName: ctx.user.name || "Usuário",
          content: input.content,
          mentions: input.mentions ? JSON.stringify(input.mentions) : null,
          createdAt: Date.now(),
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteProjectComment(input.id);
      }),
  }),

  // ============ DAILY TASKS ============
  dailyTasks: router({
    listByProject: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.READ))
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDailyTasksByProjectId(input.projectId);
      }),

    getToday: protectedProcedure
      .query(async () => {
        return await db.getTodayDailyTasks();
      }),

    create: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.CREATE))
      .input(z.object({
        projectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["Baixa", "Média", "Alta", "Crítica"]).optional(),
        assignedToId: z.number().optional(),
        assignedToName: z.string().optional(),
        dueDate: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createDailyTask({
          projectId: input.projectId,
          title: input.title,
          description: input.description || null,
          status: "Pendente",
          priority: input.priority || "Média",
          assignedToId: input.assignedToId || null,
          assignedToName: input.assignedToName || null,
          dueDate: input.dueDate || null,
          completedAt: null,
          createdById: ctx.user.id,
          createdByName: ctx.user.name || "Usuário",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }),

    update: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.UPDATE))
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["Pendente", "Em Andamento", "Concluída"]).optional(),
        priority: z.enum(["Baixa", "Média", "Alta", "Crítica"]).optional(),
        assignedToId: z.number().nullable().optional(),
        assignedToName: z.string().nullable().optional(),
        dueDate: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateDailyTask(id, data);
      }),

    complete: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.UPDATE))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.completeDailyTask(input.id);
      }),

    delete: protectedProcedure
      .use(requirePermission(MODULES.PROJETOS, ACTIONS.DELETE))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteDailyTask(input.id);
      }),
  }),

  // ============ USERS (for assignment dropdown) ============
  permissionGroups: router({
    list: protectedProcedure.query(async () => {
      return await db.getPermissionGroups();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        permissions: z.record(z.string(), z.boolean()),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can create groups
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem criar grupos",
          });
        }
        
        return await db.createPermissionGroup(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        permissions: z.record(z.string(), z.boolean()),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can update groups
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem editar grupos",
          });
        }
        
        return await db.updatePermissionGroup(input.id, input);
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can delete groups
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem excluir grupos",
          });
        }
        
        return await db.deletePermissionGroup(input.id);
      }),
  }),

  users: router({
    list: protectedProcedure.query(async () => {
      return await db.getApprovedUsers();
    }),

    updatePermissions: protectedProcedure
      .input(z.object({
        userId: z.number(),
        permissions: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can update permissions
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem alterar permissões",
          });
        }
        
        return await db.updateUserPermissions(input.userId, input.permissions);
      }),

    assignGroup: protectedProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can assign groups
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem atribuir grupos",
          });
        }
        
        return await db.assignGroupToUser(input.userId, input.groupId);
      }),
  }),

  // ============ DEPARTMENT MANAGEMENT (Admin) ============
  departments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can list departments
      if (ctx.user?.role !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem gerenciar setores",
        });
      }
      return await db.getAllDepartments();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can create departments
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem criar setores",
          });
        }
        return await db.createDepartment(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can update departments
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem editar setores",
          });
        }
        const { id, ...data } = input;
        return await db.updateDepartment(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can delete departments
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem excluir setores",
          });
        }
        return await db.deleteDepartment(input.id);
      }),

    assignToUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        departmentId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can assign departments
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem atribuir setores",
          });
        }
        return await db.assignDepartmentToUser(input.userId, input.departmentId);
      }),
  }),

  // ============ PURCHASING MODULE ============
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllSuppliers();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSupplierById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        cnpj: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        contactPerson: z.string().optional(),
        status: z.enum(["Ativo", "Inativo", "Bloqueado"]).default("Ativo"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createSupplier({
          ...input,
          createdById: ctx.user.id,
          createdByName: ctx.user.name || "Usuário",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        cnpj: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        contactPerson: z.string().optional(),
        status: z.enum(["Ativo", "Inativo", "Bloqueado"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateSupplier(id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteSupplier(input.id);
      }),
  }),

  products: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProducts();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().default("UN"),
        minStock: z.number().default(0),
        currentStock: z.number().default(0),
        status: z.enum(["Ativo", "Inativo"]).default("Ativo"),
        requiresPrescription: z.boolean().default(false),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createProduct({
          ...input,
          createdById: ctx.user.id,
          createdByName: ctx.user.name || "Usuário",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().optional(),
        minStock: z.number().optional(),
        currentStock: z.number().optional(),
        status: z.enum(["Ativo", "Inativo"]).optional(),
        requiresPrescription: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateProduct(id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteProduct(input.id);
      }),
  }),

  purchaseOrders: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPurchaseOrders();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPurchaseOrderById(input.id);
      }),

    getItems: protectedProcedure
      .input(z.object({ purchaseOrderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPurchaseOrderItems(input.purchaseOrderId);
      }),

    create: protectedProcedure
      .input(z.object({
        supplierId: z.number(),
        supplierName: z.string(),
        items: z.array(z.object({
          productId: z.number(),
          productCode: z.string(),
          productName: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
        })),
        expectedDelivery: z.number().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { items, ...orderData } = input;
        
        // Calculate total
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        
        // Generate order number
        const orderNumber = `PO-${Date.now()}`;
        
        // Create purchase order
        const order = await db.createPurchaseOrder({
          ...orderData,
          orderNumber,
          totalAmount,
          status: "Rascunho",
          createdById: ctx.user.id,
          createdByName: ctx.user.name || "Usuário",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao criar pedido" });
        
        // Create order items
        for (const item of items) {
          await db.createPurchaseOrderItem({
            purchaseOrderId: order.id,
            ...item,
            totalPrice: item.quantity * item.unitPrice,
            receivedQuantity: 0,
            createdAt: Date.now(),
          });
        }
        
        return order;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Rascunho", "Pendente", "Aprovado", "Enviado", "Recebido Parcial", "Recebido", "Cancelado"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const updates: any = { status: input.status };
        
        // If approving, set approval info
        if (input.status === "Aprovado") {
          updates.approvedById = ctx.user.id;
          updates.approvedByName = ctx.user.name || "Usuário";
          updates.approvedAt = Date.now();
        }
        
        return await db.updatePurchaseOrder(input.id, updates);
      }),
  }),

  backups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can access backups
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const { listBackups } = await import("./backupService");
      return await listBackups();
    }),

    create: protectedProcedure.mutation(async ({ ctx }) => {
      // Only admins can create backups
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const { createBackup } = await import("./backupService");
      const result = await createBackup(ctx.user.name || "Admin");
      if (!result.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Falha ao criar backup" });
      }
      return result;
    }),

    verify: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        // Only admins can verify backups
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        const { verifyBackup } = await import("./backupService");
        return await verifyBackup(input.id);
      }),

    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can restore backups
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        const { restoreBackup } = await import("./backupService");
        const result = await restoreBackup(input.id);
        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Falha ao restaurar backup" });
        }
        return result;
      }),
  }),

  // Purchasing Tasks (Kanban)
  purchasingTasks: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPurchasingTasks();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPurchasingTaskById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(["todo", "quoting", "awaiting_approval", "ordered", "received", "completed"]).default("todo"),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        assignedToId: z.number().optional(),
        tags: z.array(z.string()).default([]),
        dueDate: z.string().optional(),
        position: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const taskId = await db.createPurchasingTask({
          ...input,
          tags: input.tags.length > 0 ? input.tags.join(", ") : null,
          dueDate: input.dueDate || null,
          createdById: ctx.user.id,
        });
        return { id: taskId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["todo", "quoting", "awaiting_approval", "ordered", "received", "completed"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedToId: z.number().optional(),
        tags: z.array(z.string()).optional(),
        dueDate: z.string().optional(),
        position: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData = {
          ...data,
          tags: data.tags ? (data.tags.length > 0 ? data.tags.join(", ") : null) : undefined,
        };
        await db.updatePurchasingTask(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePurchasingTask(input.id);
        return { success: true };
      }),

    getByStatus: protectedProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getPurchasingTasksByStatus(input.status);
      }),
  }),

  // Kanban Column Settings
  kanbanColumns: router({
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        return await db.getKanbanColumnSettings(ctx.user.id, "purchasing");
      }),
    save: protectedProcedure
      .input(z.object({
        columnId: z.string(),
        customName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        await db.upsertKanbanColumnSetting({
          userId: ctx.user.id,
          module: "purchasing",
          columnKey: input.columnId,
          customName: input.customName,
        });
        return { success: true };
      }),
    getSettings: protectedProcedure
      .input(z.object({ module: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        return await db.getKanbanColumnSettings(ctx.user.id, input.module);
      }),
    updateColumnName: protectedProcedure
      .input(z.object({
        module: z.string(),
        columnKey: z.string(),
        customName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        await db.upsertKanbanColumnSetting({
          userId: ctx.user.id,
          module: input.module,
          columnKey: input.columnKey,
          customName: input.customName,
        });
        return { success: true };
      }),
  }),

  // Notifications
  notifications: router({
    list: protectedProcedure
      .input(z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        return await db.getNotificationsByUserId(ctx.user.id, {
          unreadOnly: input?.unreadOnly,
          limit: input?.limit || 50,
        });
      }),

    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        return await db.getUnreadNotificationCount(ctx.user.id);
      }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const success = await db.markNotificationAsRead(input.id, ctx.user.id);
        return { success };
      }),

    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const success = await db.markAllNotificationsAsRead(ctx.user.id);
        return { success };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const success = await db.deleteNotification(input.id, ctx.user.id);
        return { success };
      }),

    deleteAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const success = await db.deleteAllNotifications(ctx.user.id);
        return { success };
      }),

    // Check for stock alerts (can be called periodically)
    checkStockAlerts: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem verificar alertas" });
        }
        await db.checkAndCreateStockAlerts();
        return { success: true };
      }),
  }),

  // ============ CHAT SYSTEM ============
  chat: router({
    // Create a new conversation
    createConversation: protectedProcedure
      .input(z.object({
        ticketId: z.number().optional(),
        title: z.string().optional(),
        type: z.enum(['ticket_chat', 'direct_message', 'support_request']),
        participantIds: z.array(z.object({
          id: z.number(),
          name: z.string(),
          role: z.enum(['user', 'operator', 'admin']),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await db.createConversation({
          ...input,
          createdById: ctx.user.id,
          createdByName: ctx.user.name,
        });
        if (!conversation) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao criar conversa' });
        }
        return conversation;
      }),

    // Get conversation by ID
    getConversation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getConversationById(input.id);
      }),

    // Get conversation by ticket ID
    getConversationByTicket: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        return await db.getConversationByTicketId(input.ticketId);
      }),

    // Get user's conversations
    getMyConversations: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserConversations(ctx.user.id);
      }),

    // Update conversation status
    updateConversationStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['active', 'waiting', 'resolved', 'closed']),
      }))
      .mutation(async ({ input }) => {
        const success = await db.updateConversationStatus(input.id, input.status);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao atualizar status' });
        }
        return { success: true };
      }),

    // Send a message
    sendMessage: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        content: z.string().min(1),
        messageType: z.enum(['text', 'file', 'image']).optional(),
        attachmentUrl: z.string().optional(),
        attachmentName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const message = await db.sendMessage({
          ...input,
          senderId: ctx.user.id,
          senderName: ctx.user.name,
          senderRole: ctx.user.role as 'user' | 'admin',
        });
        if (!message) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar mensagem' });
        }
        return message;
      }),

    // Get messages from a conversation
    getMessages: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        limit: z.number().optional(),
        before: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getConversationMessages(input.conversationId, {
          limit: input.limit,
          before: input.before,
        });
      }),

    // Get new messages (for polling)
    getNewMessages: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        afterTimestamp: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getNewMessages(input.conversationId, input.afterTimestamp);
      }),

    // Mark messages as read
    markAsRead: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.markMessagesAsRead(input.conversationId, ctx.user.id);
        return { success };
      }),

    // Delete a message
    deleteMessage: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deleteMessage(input.messageId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao deletar mensagem' });
        }
        return { success: true };
      }),

    // Update typing status
    updateTyping: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        isTyping: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTypingStatus(input.conversationId, ctx.user.id, input.isTyping);
        return { success: true };
      }),

    // Get typing users
    getTypingUsers: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTypingUsers(input.conversationId);
      }),

    // Get conversation participants
    getParticipants: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getConversationParticipants(input.conversationId);
      }),

    // Add participant to conversation
    addParticipant: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        userId: z.number(),
        userName: z.string(),
        role: z.enum(['user', 'operator', 'admin']),
      }))
      .mutation(async ({ input }) => {
        const success = await db.addParticipantToConversation(input);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao adicionar participante' });
        }
        return { success: true };
      }),

    // Remove participant from conversation
    removeParticipant: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.removeParticipantFromConversation(input.conversationId, input.userId);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao remover participante' });
        }
        return { success: true };
      }),
  }),

  // ============ ONLINE STATUS ============
  onlineStatus: router({
    // Update current user's online status
    updateStatus: protectedProcedure
      .input(z.object({
        isOnline: z.boolean(),
        currentPage: z.string().optional(),
        statusMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserOnlineStatus({
          userId: ctx.user.id,
          userName: ctx.user.name,
          userRole: ctx.user.role as 'user' | 'admin',
          ...input,
        });
        return { success: true };
      }),

    // Get online operators/admins
    getOnlineOperators: protectedProcedure
      .query(async () => {
        return await db.getOnlineOperators();
      }),

    // Get all online users
    getAllOnline: protectedProcedure
      .query(async () => {
        return await db.getAllOnlineUsers();
      }),
  }),

  // ============ CHAT QUEUE ============
  chatQueue: router({
    // User enters the queue
    enterQueue: protectedProcedure
      .input(z.object({
        ticketId: z.number().optional(),
        initialMessage: z.string().optional(),
        priority: z.enum(['normal', 'high', 'urgent']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const queueEntry = await db.addToQueue({
          userId: ctx.user.id,
          userName: ctx.user.name,
          ...input,
        });
        if (!queueEntry) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao entrar na fila' });
        }
        return queueEntry;
      }),

    // Get user's current queue status
    getMyStatus: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserQueueStatus(ctx.user.id);
      }),

    // Get user's position in queue
    getMyPosition: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getQueuePosition(ctx.user.id);
      }),

    // User leaves the queue
    leaveQueue: protectedProcedure
      .mutation(async ({ ctx }) => {
        const success = await db.cancelQueueEntry(ctx.user.id);
        return { success };
      }),

    // Get waiting queue (admin only)
    getWaitingQueue: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem ver a fila' });
        }
        return await db.getWaitingQueue();
      }),

    // Accept a chat from queue (admin only)
    acceptChat: protectedProcedure
      .input(z.object({ queueId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem aceitar atendimentos' });
        }
        const result = await db.acceptChatFromQueue(input.queueId, ctx.user.id, ctx.user.name);
        if (!result) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao aceitar atendimento' });
        }
        return result;
      }),

    // Complete a chat (admin only)
    completeChat: protectedProcedure
      .input(z.object({ queueId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem finalizar atendimentos' });
        }
        const success = await db.completeChatFromQueue(input.queueId);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao finalizar atendimento' });
        }
        return { success: true };
      }),

    // Get operator's active chats
    getMyActiveChats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          return [];
        }
        return await db.getOperatorActiveChats(ctx.user.id);
      }),
  }),

  // ============ OPERATOR AVAILABILITY ============
  operatorAvailability: router({
    // Update operator availability (admin only)
    updateAvailability: protectedProcedure
      .input(z.object({
        isAvailableForChat: z.boolean(),
        status: z.enum(['available', 'busy', 'away', 'offline']).optional(),
        maxConcurrentChats: z.number().optional(),
        statusMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem atualizar disponibilidade' });
        }
        const result = await db.updateOperatorAvailability({
          operatorId: ctx.user.id,
          operatorName: ctx.user.name,
          ...input,
        });
        if (!result) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao atualizar disponibilidade' });
        }
        return result;
      }),

    // Get my availability (admin only)
    getMyAvailability: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          return null;
        }
        const operators = await db.getAllOperatorsAvailability();
        return operators.find(op => op.operatorId === ctx.user.id) || null;
      }),

    // Get all operators availability (admin only)
    getAllOperators: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem ver operadores' });
        }
        return await db.getAllOperatorsAvailability();
      }),

    // Get available operators (for users to see)
    getAvailable: protectedProcedure
      .query(async () => {
        return await db.getAvailableOperators();
      }),

     // Get operator stats summary
    getStats: protectedProcedure
      .query(async () => {
        return await db.getOperatorStats();
      }),
  }),

  // ============ CHAT RATINGS ============
  chatRatings: router({
    // Submit a rating for a chat session
    submit: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        operatorId: z.number(),
        operatorName: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.submitChatRating({
          conversationId: input.conversationId,
          userId: ctx.user.id,
          userName: ctx.user.name,
          operatorId: input.operatorId,
          operatorName: input.operatorName,
          rating: input.rating,
          comment: input.comment,
        });
        if (!result) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar avaliação' });
        }
        return result;
      }),

    // Check if conversation already has a rating
    getByConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChatRatingByConversation(input.conversationId);
      }),

    // Get ratings for an operator (admin only)
    getOperatorRatings: protectedProcedure
      .input(z.object({ operatorId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem ver avaliações' });
        }
        return await db.getOperatorRatings(input.operatorId);
      }),

    // Get operator average rating
    getOperatorAverage: protectedProcedure
      .input(z.object({ operatorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOperatorAverageRating(input.operatorId);
      }),

    // Get all ratings (admin only)
    getAll: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem ver avaliações' });
        }
        return await db.getAllChatRatings(input?.limit);
      }),

    // Get ratings statistics (admin only)
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem ver estatísticas' });
        }
        return await db.getChatRatingsStats();
      }),
  }),
});
export type AppRouter = typeof appRouter;
