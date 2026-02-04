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
    me: publicProcedure.query(opts => opts.ctx.user),
    
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
        sector: z.enum(["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações", "Outro"]).optional(),
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
          sector: input.sector || "Outro",
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
        sector: z.enum(["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações", "Outro"]).optional(),
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
          sector: input.sector || "Outro",
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
        sector: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getAllTickets(input);
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
        sector: z.enum(["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const nextNumber = await db.getNextTicketNumber();
        const ticketId = `bilhete_${nextNumber}`;
        const now = Date.now();

        const ticket = await db.createTicket({
          ticketId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          sector: input.sector,
          status: "Aberto",
          createdById: ctx.user.id,
          createdByName: ctx.user.name || "Usuário",
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
        sector: z.enum(["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações"]).optional(),
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

        if (input.sector && input.sector !== oldTicket.sector) {
          await db.createActivity({
            ticketId: id,
            type: "sector_change",
            authorId: ctx.user.id,
            authorName: ctx.user.name || "Usuário",
            oldValue: oldTicket.sector,
            newValue: input.sector,
            description: `Setor alterado de "${oldTicket.sector}" para "${input.sector}"`,
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
      .mutation(async ({ input }) => {
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
          startDate: input.startDate || null,
          endDate: input.endDate || null,
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
        sector: z.enum(["TI", "RH", "Financeiro", "Comercial", "Suporte", "Operações"]).optional(),
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
        return await db.deleteProject(input.id);
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
});

export type AppRouter = typeof appRouter;
