import { Category, Product, StockMovement, User } from '../models';
import { UserCreationAttributes, UserResponse, UserRole, AppError } from '../types';
import { sequelize } from '../config/database';

/**
 * Create a new user (admin only)
 * @param userData - User creation data
 * @returns Created user without password
 */
export const createUser = async (
  userData: UserCreationAttributes
): Promise<UserResponse> => {
  try {
    const user = await User.create(userData);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email already exists', 409);
    }
    throw error;
  }
};

/**
 * Get user by ID (exclude password)
 * @param id - User ID
 * @returns User without password
 */
export const getUserById = async (id: string): Promise<UserResponse> => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user.toJSON() as UserResponse;
};

/**
 * Update user
 * @param id - User ID
 * @param updateData - Data to update
 * @returns Updated user without password
 */
export const updateUser = async (
  id: string,
  updateData: Partial<UserCreationAttributes>
): Promise<UserResponse> => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  try {
    await user.update(updateData);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email already exists', 409);
    }
    throw error;
  }
};

/**
 * Deactivate user
 * @param id - User ID
 * @returns Deactivated user without password
 */
export const deactivateUser = async (id: string): Promise<UserResponse> => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.update({ isActive: false });

  // Return user without password
  const { password, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
};

/**
 * Update user role
 * @param id - User ID
 * @param role - New role
 * @returns Updated user without password
 */
export const updateUserRole = async (id: string, role: UserRole): Promise<UserResponse> => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.update({ role });

  // Return user without password
  const { password, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
};

/**
 * Public: total number of registered users (for landing page stats)
 * @returns Object with the total user count
 */
export const getPublicUserCount = async (): Promise<{ total: number }> => {
  const total = await User.count();
  return { total };
};

// ============================================
// GESTIÓN MULTI-TENANT DE OPERADORES
// ============================================

/**
 * Lista usuarios según el rol del solicitante:
 * - client: únicamente sus operadores
 * - admin: todos los usuarios con nombre del dueño
 */
export const getAllUsers = async (
  caller: { id: string; role: string }
): Promise<UserResponse[]> => {
  if (caller.role === 'admin') {
    const users = await User.findAll({
      order: [
        ['role', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    // Adjuntar nombre del cliente dueño para operadores
    const owners = await User.findAll({ where: { role: 'client' } });
    const ownerMap = new Map(owners.map(o => [o.id, o.name]));

    return users.map(u => {
      const json = u.toJSON() as any;
      delete json.password;
      return {
        ...json,
        ownerName: json.role === 'operator' ? ownerMap.get(json.ownerId) ?? null : null,
      } as unknown as UserResponse;
    });
  }

  // client: sus operadores
  const operators = await User.findAll({
    where: { ownerId: caller.id },
    order: [['createdAt', 'DESC']],
  });

  return operators.map(o => {
    const json = o.toJSON() as any;
    delete json.password;
    return json as unknown as UserResponse;
  });
};

/**
 * Crea un operador para el cliente autenticado.
 */
export const createOperator = async (
  caller: { id: string; role: string },
  data: { name?: string; email?: string; password?: string; role?: string; ownerId?: string }
): Promise<UserResponse> => {
  const { email, password, name } = data;

  if (!email || !password || !name) {
    throw new AppError('Nombre, correo y contraseña son requeridos', 400);
  }

  let role: 'operator' = 'operator';
  let ownerId: string = caller.id;

  // El admin puede crear operadores para cualquier cliente (supervisión)
  if (caller.role === 'admin') {
    ownerId = data.ownerId || data.email === undefined ? data.ownerId || ownerId : ownerId;
    if (data.role && data.role !== 'operator') {
      throw new AppError('Solo se pueden crear cuentas de tipo operator', 400);
    }
    if (!data.ownerId) {
      throw new AppError('Indica el clientId al que pertenecerá el operador', 400);
    }
    ownerId = data.ownerId;
  }

  const user = await User.create({
    email: email.trim().toLowerCase(),
    password,
    name: name.trim(),
    role,
    ownerId,
  });

  const json = user.toJSON() as any;
  delete json.password;
  return json as unknown as UserResponse;
};

const toUserResponse = (user: User): UserResponse => {
  const json = user.toJSON() as any;
  delete json.password;
  return json as unknown as UserResponse;
};

/**
 * Obtiene un usuario validando que el solicitante tenga acceso:
 * - admin: cualquiera
 * - client: solo operadores con ownerId = su id
 */
export const getUserByIdForCaller = async (
  id: string,
  caller: { id: string; role: string }
): Promise<UserResponse> => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  if (caller.role !== 'admin' && user.ownerId !== caller.id) {
    throw new AppError('No tienes acceso a este usuario', 403);
  }

  return toUserResponse(user);
};

/**
 * Actualiza un usuario validando permisos:
 * - admin: cualquier campo de cualquier usuario (incluyendo plan, planStatus, planExpiry)
 * - client: solo nombre/contraseña de sus operadores
 */
export const updateUserForCaller = async (
  id: string,
  data: Partial<Pick<UserCreationAttributes, 'name' | 'password'>> & {
    plan?: string | null;
    planStatus?: string | null;
    planExpiry?: string | null;
    emailVerified?: boolean;
  },
  caller: { id: string; role: string }
): Promise<UserResponse> => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  if (caller.role !== 'admin') {
    if (user.ownerId !== caller.id) {
      throw new AppError('No tienes acceso a este usuario', 403);
    }
  }

  const updateData: Record<string, any> = {};
  if (data.name?.trim()) updateData.name = data.name.trim();
  if (data.password) {
    if (data.password.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }
    updateData.password = data.password;
  }

  // Solo el admin puede actualizar campos de plan y verificación
  if (caller.role === 'admin') {
    if (data.plan !== undefined) updateData.plan = data.plan;
    if (data.planStatus !== undefined) updateData.planStatus = data.planStatus;
    if (data.planExpiry !== undefined) {
      updateData.planExpiry = data.planExpiry ? new Date(data.planExpiry) : null;
    }
    if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('Nada que actualizar', 400);
  }

  await user.update(updateData);
  return toUserResponse(user);
};

/**
 * Elimina permanentemente un operador:
 * - client: solo operadores propios
 * - admin: cualquier usuario no-admin
 * Los movimientos históricos del operador se conservan (userId queda huérfano
 * a nivel informativo, el inventario pertenece al cliente).
 */
export const deleteUserForCaller = async (
  id: string,
  caller: { id: string; role: string }
): Promise<void> => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  if (user.id === caller.id) {
    throw new AppError('No puedes eliminar tu propia cuenta', 400);
  }

  if (caller.role !== 'admin') {
    if (user.role !== 'operator' || user.ownerId !== caller.id) {
      throw new AppError('Solo puedes eliminar operadores que tú creaste', 403);
    }
  } else if (user.role === 'admin') {
    throw new AppError('No se puede eliminar otra cuenta admin', 400);
  }

  // Desasignar movimientos históricos del operador antes de eliminarlo
  await sequelize.query(
    `UPDATE stock_movements SET "userId" = :newOwner WHERE "userId" = :operatorId`,
    { replacements: { newOwner: user.ownerId ?? caller.id, operatorId: user.id } }
  );

  await user.destroy();
};

/**
 * Overview global para supervisión del admin.
 */
export interface AdminOverview {
  clients: number;
  operators: number;
  products: number;
  categories: number;
  movements: number;
  recentClients: Array<{ id: string; name: string; email: string; createdAt: Date }>;
}

export const getAdminOverview = async (): Promise<AdminOverview> => {
  const [clients, operators, products, categories, movements, recentClients] =
    await Promise.all([
      User.count({ where: { role: 'client' } }),
      User.count({ where: { role: 'operator' } }),
      Product.count(),
      Category.count(),
      StockMovement.count(),
      User.findAll({
        where: { role: 'client' },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'name', 'email', 'createdAt'],
      }),
    ]);

  return {
    clients,
    operators,
    products,
    categories,
    movements,
    recentClients: recentClients.map(u => u.toJSON() as any),
  };
};

/**
 * Update exchange rate mode for a user
 * @param userId - User ID
 * @param mode - 'auto' or 'manual'
 * @param customRate - Custom rate value (null when mode is 'auto')
 * @returns Updated user without password
 */
export const updateExchangeRate = async (
  userId: string,
  mode: 'auto' | 'manual',
  customRate: number | null
): Promise<UserResponse> => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.update({
    exchangeRateMode: mode,
    customExchangeRate: mode === 'manual' ? customRate : null,
  });

  const { password, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
};

/**
 * Reset all manual exchange rates to auto (used by Monday cron)
 */
export const resetAllManualRates = async (): Promise<number> => {
  const [affectedCount] = await User.update(
    { exchangeRateMode: 'auto', customExchangeRate: null },
    { where: { exchangeRateMode: 'manual' } }
  );
  return affectedCount;
};
