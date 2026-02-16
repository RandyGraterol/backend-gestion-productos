import { User } from '../models';
import { UserCreationAttributes, UserResponse } from '../types';
import { generateToken } from '../utils/jwt';
import { AppError } from '../types';

/**
 * Register a new user (operators only)
 * @param userData - User registration data
 * @returns Created user (without password) and JWT token
 */
export const register = async (
  userData: UserCreationAttributes
): Promise<{ user: UserResponse; token: string }> => {
  try {
    // Force role to 'employee' for public registration
    const operatorData = {
      ...userData,
      role: 'employee' as const,
    };

    // Create user (password will be hashed by model hook)
    const user = await User.create(operatorData);

    // Convert to UserResponse (exclude password)
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Generate JWT token
    const token = generateToken(userResponse);

    return { user: userResponse, token };
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email already exists', 409);
    }
    throw error;
  }
};

/**
 * Login user with email and password
 * @param email - User email
 * @param password - User password
 * @returns User (without password) and JWT token
 */
export const login = async (
  email: string,
  password: string
): Promise<{ user: UserResponse; token: string }> => {
  // Find user by email
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Convert to UserResponse (exclude password)
  const userResponse: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  // Generate JWT token
  const token = generateToken(userResponse);

  return { user: userResponse, token };
};

/**
 * Get current user by ID
 * @param userId - User ID
 * @returns User (without password)
 */
export const getCurrentUser = async (userId: string): Promise<UserResponse> => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Convert to UserResponse (exclude password)
  const userResponse: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return userResponse;
};
