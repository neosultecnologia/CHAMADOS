/**
 * Module permissions system
 * Defines available modules and permission checking utilities
 */

export const MODULES = {
  CHAMADOS: 'chamados',
  PROJETOS: 'projetos',
  RH: 'rh',
  ECOMMERCE: 'ecommerce',
  MARKETING: 'marketing',
  TECNOLOGIA: 'tecnologia',
} as const;

export type Module = typeof MODULES[keyof typeof MODULES];

export type UserPermissions = Module[];

export interface UserWithPermissions {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  permissions: UserPermissions;
}

/**
 * Check if user has permission to access a module
 * Admins have access to all modules by default
 */
export function hasModulePermission(
  user: { role: string; permissions?: unknown } | null | undefined,
  module: Module
): boolean {
  if (!user) return false;
  
  // Admins have access to everything
  if (user.role === 'admin') return true;
  
  // Parse permissions from JSON string or array
  let permissionsObj: Record<string, boolean> = {};
  
  if (typeof user.permissions === 'string') {
    try {
      permissionsObj = JSON.parse(user.permissions);
    } catch {
      return false;
    }
  } else if (Array.isArray(user.permissions)) {
    // Legacy array format support
    return user.permissions.includes(module);
  } else if (typeof user.permissions === 'object' && user.permissions !== null) {
    permissionsObj = user.permissions as Record<string, boolean>;
  }
  
  return permissionsObj[module] === true;
}

/**
 * Get list of modules user has access to
 */
export function getUserModules(user: { role: string; permissions?: unknown } | null | undefined): Module[] {
  if (!user) return [];
  
  // Admins have access to all modules
  if (user.role === 'admin') {
    return Object.values(MODULES);
  }
  
  // Parse permissions from JSON string or array
  let permissionsObj: Record<string, boolean> = {};
  
  if (typeof user.permissions === 'string') {
    try {
      permissionsObj = JSON.parse(user.permissions);
    } catch {
      return [];
    }
  } else if (Array.isArray(user.permissions)) {
    // Legacy array format support
    return user.permissions.filter((p): p is Module => 
      Object.values(MODULES).includes(p as Module)
    );
  } else if (typeof user.permissions === 'object' && user.permissions !== null) {
    permissionsObj = user.permissions as Record<string, boolean>;
  }
  
  // Return modules where permission is true
  return Object.entries(permissionsObj)
    .filter(([_, hasAccess]) => hasAccess)
    .map(([module]) => module as Module)
    .filter(module => Object.values(MODULES).includes(module));
}
