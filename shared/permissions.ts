/**
 * Granular permissions system
 * Defines available modules, actions, and permission checking utilities
 */

export const MODULES = {
  CHAMADOS: 'chamados',
  PROJETOS: 'projetos',
  RH: 'rh',
  COMPRAS: 'compras',
  MARKETING: 'marketing',
  TECNOLOGIA: 'tecnologia',
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type Module = typeof MODULES[keyof typeof MODULES];
export type Action = typeof ACTIONS[keyof typeof ACTIONS];

/**
 * Granular permission structure per module
 * Each module can have specific action permissions
 */
export interface ModulePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

/**
 * User permissions structure
 * Maps each module to its action permissions
 */
export type UserPermissions = {
  [K in Module]?: ModulePermissions;
};

export interface UserWithPermissions {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  permissions: UserPermissions;
}

/**
 * Default permissions for a module (all actions disabled)
 */
export const DEFAULT_MODULE_PERMISSIONS: ModulePermissions = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

/**
 * Full access permissions for a module (all actions enabled)
 */
export const FULL_MODULE_PERMISSIONS: ModulePermissions = {
  create: true,
  read: true,
  update: true,
  delete: true,
};

/**
 * Check if user has permission to perform a specific action on a module
 * Admins have full access to all modules and actions by default
 */
export function hasPermission(
  user: { role: string; permissions?: unknown } | null | undefined,
  module: Module,
  action: Action
): boolean {
  if (!user) return false;
  
  // Admins have full access to everything
  if (user.role === 'admin') return true;
  
  // Parse permissions
  const permissions = parsePermissions(user.permissions);
  
  // Check if module exists in permissions
  const modulePerms = permissions[module];
  if (!modulePerms) return false;
  
  // Check specific action
  return modulePerms[action] === true;
}

/**
 * Check if user has read access to a module (legacy compatibility)
 */
export function hasModulePermission(
  user: { role: string; permissions?: unknown } | null | undefined,
  module: Module
): boolean {
  return hasPermission(user, module, ACTIONS.READ);
}

/**
 * Parse permissions from various formats (JSON string, object, legacy array)
 */
function parsePermissions(permissions: unknown): UserPermissions {
  // Handle JSON string
  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      return normalizePermissions(parsed);
    } catch {
      return {};
    }
  }
  
  // Handle legacy array format (convert to read-only access)
  if (Array.isArray(permissions)) {
    const result: UserPermissions = {};
    for (const module of permissions) {
      if (Object.values(MODULES).includes(module as Module)) {
        result[module as Module] = { ...FULL_MODULE_PERMISSIONS };
      }
    }
    return result;
  }
  
  // Handle object format
  if (typeof permissions === 'object' && permissions !== null) {
    return normalizePermissions(permissions);
  }
  
  return {};
}

/**
 * Normalize permissions object to ensure proper structure
 * Handles both legacy boolean format and new granular format
 */
function normalizePermissions(permissions: any): UserPermissions {
  const result: UserPermissions = {};
  
  for (const module of Object.values(MODULES)) {
    const moduleValue = permissions[module];
    
    // If it's a boolean (legacy format), convert to full or no access
    if (typeof moduleValue === 'boolean') {
      result[module] = moduleValue ? { ...FULL_MODULE_PERMISSIONS } : { ...DEFAULT_MODULE_PERMISSIONS };
    }
    // If it's an object with action permissions (new format)
    else if (typeof moduleValue === 'object' && moduleValue !== null) {
      result[module] = {
        create: moduleValue.create === true,
        read: moduleValue.read === true,
        update: moduleValue.update === true,
        delete: moduleValue.delete === true,
      };
    }
  }
  
  return result;
}

/**
 * Get list of modules user has read access to
 */
export function getUserModules(user: { role: string; permissions?: unknown } | null | undefined): Module[] {
  if (!user) return [];
  
  // Admins have access to all modules
  if (user.role === 'admin') {
    return Object.values(MODULES);
  }
  
  const permissions = parsePermissions(user.permissions);
  
  // Return modules where user has at least read access
  return Object.entries(permissions)
    .filter(([module, perms]) => perms.read === true)
    .map(([module]) => module as Module)
    .filter(module => Object.values(MODULES).includes(module));
}

/**
 * Get user's permissions for a specific module
 */
export function getModulePermissions(
  user: { role: string; permissions?: unknown } | null | undefined,
  module: Module
): ModulePermissions {
  if (!user) return { ...DEFAULT_MODULE_PERMISSIONS };
  
  // Admins have full access
  if (user.role === 'admin') return { ...FULL_MODULE_PERMISSIONS };
  
  const permissions = parsePermissions(user.permissions);
  return permissions[module] || { ...DEFAULT_MODULE_PERMISSIONS };
}

/**
 * Check if user can perform any action on a module
 */
export function hasAnyPermission(
  user: { role: string; permissions?: unknown } | null | undefined,
  module: Module
): boolean {
  const perms = getModulePermissions(user, module);
  return perms.create || perms.read || perms.update || perms.delete;
}
