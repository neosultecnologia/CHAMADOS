import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';
import { hasModulePermission, MODULES, type UserPermissions } from '../shared/permissions';

describe('Module Permissions System', () => {
  describe('Permission Helper Functions', () => {
    it('should correctly identify users with module permissions', () => {
      const userWithTickets = {
        id: 1,
        role: 'user' as const,
        permissions: JSON.stringify({
          chamados: true,
          projetos: false,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      expect(hasModulePermission(userWithTickets, MODULES.CHAMADOS)).toBe(true);
      expect(hasModulePermission(userWithTickets, MODULES.PROJETOS)).toBe(false);
      expect(hasModulePermission(userWithTickets, MODULES.RH)).toBe(false);
    });

    it('should grant admins access to all modules', () => {
      const adminUser = {
        id: 1,
        role: 'admin' as const,
        permissions: JSON.stringify({
          chamados: false,
          projetos: false,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      // Admin should have access regardless of permissions field
      expect(hasModulePermission(adminUser, MODULES.CHAMADOS)).toBe(true);
      expect(hasModulePermission(adminUser, MODULES.PROJETOS)).toBe(true);
      expect(hasModulePermission(adminUser, MODULES.RH)).toBe(true);
      expect(hasModulePermission(adminUser, MODULES.ECOMMERCE)).toBe(true);
      expect(hasModulePermission(adminUser, MODULES.MARKETING)).toBe(true);
      expect(hasModulePermission(adminUser, MODULES.TECNOLOGIA)).toBe(true);
    });

    it('should handle users with multiple module permissions', () => {
      const multiAccessUser = {
        id: 1,
        role: 'user' as const,
        permissions: JSON.stringify({
          chamados: true,
          projetos: true,
          rh: true,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      expect(hasModulePermission(multiAccessUser, MODULES.CHAMADOS)).toBe(true);
      expect(hasModulePermission(multiAccessUser, MODULES.PROJETOS)).toBe(true);
      expect(hasModulePermission(multiAccessUser, MODULES.RH)).toBe(true);
      expect(hasModulePermission(multiAccessUser, MODULES.ECOMMERCE)).toBe(false);
      expect(hasModulePermission(multiAccessUser, MODULES.MARKETING)).toBe(false);
      expect(hasModulePermission(multiAccessUser, MODULES.TECNOLOGIA)).toBe(false);
    });

    it('should handle users with no permissions', () => {
      const noAccessUser = {
        id: 1,
        role: 'user' as const,
        permissions: JSON.stringify({
          chamados: false,
          projetos: false,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      expect(hasModulePermission(noAccessUser, MODULES.CHAMADOS)).toBe(false);
      expect(hasModulePermission(noAccessUser, MODULES.PROJETOS)).toBe(false);
      expect(hasModulePermission(noAccessUser, MODULES.RH)).toBe(false);
    });

    it('should handle null or undefined permissions gracefully', () => {
      const userWithoutPermissions = {
        id: 1,
        role: 'user' as const,
        permissions: null,
      };

      // Should default to false for regular users
      expect(hasModulePermission(userWithoutPermissions, MODULES.CHAMADOS)).toBe(false);
    });
  });

  describe('Permission Middleware', () => {
    it('should allow access to tickets for users with chamados permission', async () => {
      const userWithTicketsAccess = {
        id: 1,
        role: 'user' as const,
        permissions: JSON.stringify({
          chamados: true,
          projetos: false,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      const caller = appRouter.createCaller({
        user: userWithTicketsAccess,
      } as Context);

      // This should succeed because user has chamados permission
      const tickets = await caller.tickets.list();
      expect(Array.isArray(tickets)).toBe(true);
    });

    it('should allow access to projects for users with projetos permission', async () => {
      const userWithProjectsAccess = {
        id: 1,
        role: 'user' as const,
        permissions: JSON.stringify({
          chamados: false,
          projetos: true,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      const caller = appRouter.createCaller({
        user: userWithProjectsAccess,
      } as Context);

      // This should succeed because user has projetos permission
      const projects = await caller.projects.list();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('should deny access to tickets for users without chamados permission', async () => {
      const userWithoutTicketsAccess = {
        id: 1,
        role: 'user' as const,
        permissions: JSON.stringify({
          chamados: false,
          projetos: true,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      const caller = appRouter.createCaller({
        user: userWithoutTicketsAccess,
      } as Context);

      // This should throw an error
      await expect(caller.tickets.list()).rejects.toThrow();
    });

    it('should deny access to projects for users without projetos permission', async () => {
      const userWithoutProjectsAccess = {
        id: 1,
        role: 'user' as const,
        permissions: JSON.stringify({
          chamados: true,
          projetos: false,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      const caller = appRouter.createCaller({
        user: userWithoutProjectsAccess,
      } as Context);

      // This should throw an error
      await expect(caller.projects.list()).rejects.toThrow();
    });

    it('should allow admins to access all modules', async () => {
      const adminUser = {
        id: 1,
        role: 'admin' as const,
        permissions: JSON.stringify({
          chamados: false,
          projetos: false,
          rh: false,
          ecommerce: false,
          marketing: false,
          tecnologia: false,
        }),
      };

      const caller = appRouter.createCaller({
        user: adminUser,
      } as Context);

      // Admins should have access to everything
      const tickets = await caller.tickets.list();
      expect(Array.isArray(tickets)).toBe(true);

      const projects = await caller.projects.list();
      expect(Array.isArray(projects)).toBe(true);
    });
  });
});
