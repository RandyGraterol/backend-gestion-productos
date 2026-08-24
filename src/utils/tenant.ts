import { UserResponse } from '../types';

/**
 * Resuelve el "tenant" (dueño del inventario) de un usuario autenticado.
 * - admin: su propio id (con bypass por tenantId para supervisión)
 * - client: su propio id
 * - operator: el id de SU CLIENTE (ownerId) — trabaja el inventario del cliente
 */
export const resolveTenantId = (
  user: Pick<UserResponse, 'id' | 'role' | 'ownerId'>
): string => {
  if (user.role === 'operator' && user.ownerId) {
    return user.ownerId;
  }
  return user.id;
};

/**
 * Igual que resolveTenantId pero permite al admin supervisar un tenant
 * específico mediante query param ?tenantId=
 */
export const resolveTenantIdWithBypass = (
  user: Pick<UserResponse, 'id' | 'role' | 'ownerId'>,
  tenantId?: string
): string => {
  if (user.role === 'admin' && tenantId) {
    return tenantId;
  }
  return resolveTenantId(user);
};
