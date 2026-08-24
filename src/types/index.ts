import { Request } from 'express';

// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

/**
 * Roles del sistema multi-tenant:
 * - admin: dueño del sistema, ve todo
 * - client: cliente registrado, tiene su propio inventario
 * - operator: creado por un client, trabaja el inventario de ese client
 */
export type UserRole = 'admin' | 'client' | 'operator';

export type BusinessType =
  | 'bodega'
  | 'licoreria'
  | 'abasto'
  | 'supermercado'
  | 'farmacia'
  | 'otro';

export type PlanType = 'mensual' | 'anual' | 'lifetime' | null;
export type PlanStatus = 'activo' | 'pendiente' | 'expirado' | null;

export interface UserAttributes {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  /** Cliente dueño del inventario (solo para operators) */
  ownerId?: string | null;
  /** Nombre del cliente dueño (solo lectura, para operadores) */
  ownerName?: string | null;
  phone?: string | null;
  businessType?: BusinessType | null;
  emailVerified: boolean;
  avatar?: string;
  isActive: boolean;
  /** Tipo de plan contratado */
  plan?: PlanType;
  /** Estado del plan */
  planStatus?: PlanStatus;
  /** Fecha de expiración del plan */
  planExpiry?: Date | null;
  /** Fecha de inicio del periodo de prueba gratuito (30 días) */
  trialStartDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  /** Cliente que crea al operador */
  ownerId?: string | null;
  phone?: string | null;
  businessType?: BusinessType | null;
  emailVerified?: boolean;
  avatar?: string;
  isActive?: boolean;
}

// User without password for API responses
export type UserResponse = Omit<UserAttributes, 'password'>;

// ============================================
// PRODUCT & INVENTORY TYPES
// ============================================

export interface ProductAttributes {
  id: string;
  userId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  brand?: string;
  unit: string;
  price: number;
  cost: number;
  currency: 'USD' | 'VES';
  stock: number;
  minStock: number;
  maxStock?: number;
  location?: string;
  barcode?: string;
  imageUrl?: string;
  expiryDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreationAttributes {
  userId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  brand?: string;
  unit: string;
  price: number;
  cost: number;
  currency?: 'USD' | 'VES';
  stock: number;
  minStock: number;
  maxStock?: number;
  location?: string;
  barcode?: string;
  imageUrl?: string;
  expiryDate?: Date;
  isActive?: boolean;
}

// ============================================
// PRODUCT IMAGE TYPES
// ============================================

export interface ProductImageAttributes {
  id: string;
  productId: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImageCreationAttributes {
  productId: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

// ============================================
// CATEGORY TYPES
// ============================================

export interface CategoryAttributes {
  id: string;
  userId: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreationAttributes {
  userId: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  color?: string;
}

// ============================================
// STOCK MOVEMENT TYPES
// ============================================

export type MovementType = 'in' | 'out' | 'adjustment' | 'transfer' | 'credit';

export interface StockMovementAttributes {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  userId: string;
  exchangeRate?: number;
  createdAt: Date;
}

export interface StockMovementCreationAttributes {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  userId: string;
  exchangeRate?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationParams;
}

export interface FilterParams {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// EXPRESS REQUEST EXTENSIONS
// ============================================

export interface AuthRequest extends Request {
  user?: UserResponse;
}

// ============================================
// JWT PAYLOAD
// ============================================

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Cliente dueño del inventario cuando el rol es operator */
  ownerId?: string | null;
}

// ============================================
// ERROR TYPES
// ============================================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
