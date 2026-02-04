import { describe, it, expect } from 'vitest';
import { hasPermission, MODULES, ACTIONS, parsePermissions, getModulePermissions } from '@shared/permissions';

describe('Granular Permissions System', () => {
  describe('hasPermission function', () => {
    it('should grant all permissions to admin users', () => {
      const admin = {
        role: 'admin',
        permissions: null,
      };

      expect(hasPermission(admin, MODULES.CHAMADOS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(admin, MODULES.CHAMADOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(admin, MODULES.CHAMADOS, ACTIONS.UPDATE)).toBe(true);
      expect(hasPermission(admin, MODULES.CHAMADOS, ACTIONS.DELETE)).toBe(true);
      expect(hasPermission(admin, MODULES.PROJETOS, ACTIONS.CREATE)).toBe(true);
    });

    it('should deny all permissions to null user', () => {
      expect(hasPermission(null, MODULES.CHAMADOS, ACTIONS.READ)).toBe(false);
      expect(hasPermission(undefined, MODULES.PROJETOS, ACTIONS.CREATE)).toBe(false);
    });

    it('should check specific action permissions for regular users', () => {
      const user = {
        role: 'user',
        permissions: {
          chamados: {
            create: true,
            read: true,
            update: false,
            delete: false,
          },
          projetos: {
            create: false,
            read: true,
            update: true,
            delete: false,
          },
        },
      };

      // Chamados permissions
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.UPDATE)).toBe(false);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.DELETE)).toBe(false);

      // Projetos permissions
      expect(hasPermission(user, MODULES.PROJETOS, ACTIONS.CREATE)).toBe(false);
      expect(hasPermission(user, MODULES.PROJETOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(user, MODULES.PROJETOS, ACTIONS.UPDATE)).toBe(true);
      expect(hasPermission(user, MODULES.PROJETOS, ACTIONS.DELETE)).toBe(false);
    });

    it('should deny access to modules not in permissions', () => {
      const user = {
        role: 'user',
        permissions: {
          chamados: {
            create: true,
            read: true,
            update: true,
            delete: true,
          },
        },
      };

      expect(hasPermission(user, MODULES.PROJETOS, ACTIONS.READ)).toBe(false);
      expect(hasPermission(user, MODULES.RH, ACTIONS.CREATE)).toBe(false);
    });

    it('should handle JSON string permissions', () => {
      const user = {
        role: 'user',
        permissions: JSON.stringify({
          chamados: {
            create: false,
            read: true,
            update: false,
            delete: false,
          },
        }),
      };

      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.CREATE)).toBe(false);
    });

    it('should handle legacy array format (full access)', () => {
      const user = {
        role: 'user',
        permissions: ['chamados', 'projetos'],
      };

      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.UPDATE)).toBe(true);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.DELETE)).toBe(true);
      expect(hasPermission(user, MODULES.PROJETOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(user, MODULES.RH, ACTIONS.READ)).toBe(false);
    });

    it('should handle legacy boolean format', () => {
      const user = {
        role: 'user',
        permissions: {
          chamados: true,
          projetos: false,
        },
      };

      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(user, MODULES.CHAMADOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(user, MODULES.PROJETOS, ACTIONS.READ)).toBe(false);
    });
  });

  describe('getModulePermissions function', () => {
    it('should return full permissions for admin', () => {
      const admin = {
        role: 'admin',
        permissions: null,
      };

      const perms = getModulePermissions(admin, MODULES.CHAMADOS);
      expect(perms.create).toBe(true);
      expect(perms.read).toBe(true);
      expect(perms.update).toBe(true);
      expect(perms.delete).toBe(true);
    });

    it('should return specific module permissions for regular user', () => {
      const user = {
        role: 'user',
        permissions: {
          chamados: {
            create: true,
            read: true,
            update: false,
            delete: false,
          },
        },
      };

      const perms = getModulePermissions(user, MODULES.CHAMADOS);
      expect(perms.create).toBe(true);
      expect(perms.read).toBe(true);
      expect(perms.update).toBe(false);
      expect(perms.delete).toBe(false);
    });

    it('should return default (no access) for modules not in permissions', () => {
      const user = {
        role: 'user',
        permissions: {
          chamados: {
            create: true,
            read: true,
            update: true,
            delete: true,
          },
        },
      };

      const perms = getModulePermissions(user, MODULES.PROJETOS);
      expect(perms.create).toBe(false);
      expect(perms.read).toBe(false);
      expect(perms.update).toBe(false);
      expect(perms.delete).toBe(false);
    });
  });

  describe('Permission scenarios', () => {
    it('should allow read-only access', () => {
      const readOnlyUser = {
        role: 'user',
        permissions: {
          chamados: {
            create: false,
            read: true,
            update: false,
            delete: false,
          },
          projetos: {
            create: false,
            read: true,
            update: false,
            delete: false,
          },
        },
      };

      // Can read
      expect(hasPermission(readOnlyUser, MODULES.CHAMADOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(readOnlyUser, MODULES.PROJETOS, ACTIONS.READ)).toBe(true);

      // Cannot modify
      expect(hasPermission(readOnlyUser, MODULES.CHAMADOS, ACTIONS.CREATE)).toBe(false);
      expect(hasPermission(readOnlyUser, MODULES.CHAMADOS, ACTIONS.UPDATE)).toBe(false);
      expect(hasPermission(readOnlyUser, MODULES.CHAMADOS, ACTIONS.DELETE)).toBe(false);
    });

    it('should allow create and read but not update or delete', () => {
      const contributorUser = {
        role: 'user',
        permissions: {
          chamados: {
            create: true,
            read: true,
            update: false,
            delete: false,
          },
        },
      };

      expect(hasPermission(contributorUser, MODULES.CHAMADOS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(contributorUser, MODULES.CHAMADOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(contributorUser, MODULES.CHAMADOS, ACTIONS.UPDATE)).toBe(false);
      expect(hasPermission(contributorUser, MODULES.CHAMADOS, ACTIONS.DELETE)).toBe(false);
    });

    it('should allow full access except delete', () => {
      const editorUser = {
        role: 'user',
        permissions: {
          projetos: {
            create: true,
            read: true,
            update: true,
            delete: false,
          },
        },
      };

      expect(hasPermission(editorUser, MODULES.PROJETOS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(editorUser, MODULES.PROJETOS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(editorUser, MODULES.PROJETOS, ACTIONS.UPDATE)).toBe(true);
      expect(hasPermission(editorUser, MODULES.PROJETOS, ACTIONS.DELETE)).toBe(false);
    });
  });
});
