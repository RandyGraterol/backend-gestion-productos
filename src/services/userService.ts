import { User } from '../models';
import { UserCreationAttributes, UserResponse, UserRole } from '../types';
import { AppError } from '../types';

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
 * Get all users (exclude passwords)
 * @returns Array of users without passwords
 */
export const getAllUsers = async (): Promise<UserResponse[]> => {
  const users = await User.findAll({
    attributes: { exclude: ['password'] },
    order: [['name', 'ASC']],
  });

  return users.map(user => user.toJSON() as UserResponse);
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
