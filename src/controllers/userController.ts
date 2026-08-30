import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { AuthRequest } from '../types';

/**
 * Listar usuarios según el rol del solicitante:
 * - client: solo SUS operadores (ownerId = su id)
 * - admin: todos los usuarios con información de su dueño
 * GET /api/users
 */
export const getAllHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await userService.getAllUsers(req.user!);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear operador:
 * - client: crea un operator con ownerId = su id
 * - admin: puede crear cualquier rol (supervisión)
 * POST /api/users
 */
export const createHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.createOperator(req.user!, req.body);

    res.status(201).json({
      success: true,
      data: user,
      message: 'Operador creado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener usuario por ID:
 * - client: solo sus propios operadores
 * - admin: cualquiera
 * GET /api/users/:id
 */
export const getByIdHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserByIdForCaller(req.params.id, req.user!);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar usuario:
 * - client: solo nombre/contraseña de SUS operadores
 * - admin: cualquiera
 * PUT /api/users/:id
 */
export const updateHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const allowedFields =
      req.user!.role === 'admin'
        ? {
            name: req.body.name,
            password: req.body.password,
            plan: req.body.plan,
            planStatus: req.body.planStatus,
            planExpiry: req.body.planExpiry,
            emailVerified: req.body.emailVerified,
          }
        : { name: req.body.name, password: req.body.password };

    const user = await userService.updateUserForCaller(req.params.id, allowedFields, req.user!);

    res.status(200).json({
      success: true,
      data: user,
      message: 'Usuario actualizado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar usuario permanentemente:
 * - client: solo SUS operadores
 * - admin: cualquiera
 * DELETE /api/users/:id
 */
export const deactivateHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await userService.deleteUserForCaller(req.params.id, req.user!);

    res.status(200).json({
      success: true,
      message: 'Operador eliminado correctamente. Sus movimientos históricos se conservan.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: total registered users (landing page stats)
 * GET /api/users/count
 */
export const publicCountHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await userService.getPublicUserCount();
    res.status(200).json({
      success: true,
      data: result,
      message: 'User count retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};
