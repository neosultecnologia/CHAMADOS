import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ TICKETS ============
  tickets: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        sector: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getAllTickets(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTicketById(input.id);
      }),

    getByTicketId: protectedProcedure
      .input(z.object({ ticketId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTicketByTicketId(input.ticketId);
      }),

    create: protectedProcedure
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

  // ============ USERS (for assignment dropdown) ============
  users: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllUsers();
    }),
  }),
});

export type AppRouter = typeof appRouter;
