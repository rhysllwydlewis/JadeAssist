/**
 * User Service - Business logic for user operations
 */
import jwt from 'jsonwebtoken';
import { UserModel, CreateUserParams, UpdateUserParams } from '../models/User';
import { User, UserSession, AuthProvider } from '@jadeassist/shared';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class UserService {
  /**
   * Create a new user
   */
  async createUser(params: CreateUserParams): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findByAuthId(params.authProvider, params.authId);

      if (existingUser) {
        logger.info({ userId: existingUser.id }, 'User already exists');
        return existingUser;
      }

      // Create new user
      const user = await UserModel.create(params);
      return user;
    } catch (error) {
      logger.error({ error, params }, 'Failed to create user');
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return await UserModel.findById(id);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await UserModel.findByEmail(email);
  }

  /**
   * Update user
   */
  async updateUser(id: string, params: UpdateUserParams): Promise<User | null> {
    return await UserModel.update(id, params);
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    return await UserModel.delete(id);
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, env.auth.jwtSecret, {
      expiresIn: '7d',
    });
  }

  /**
   * Create user session
   */
  async createSession(user: User): Promise<UserSession> {
    const token = this.generateToken(user);

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      userId: user.id,
      token,
      expiresAt,
    };
  }

  /**
   * Verify token and get user
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, env.auth.jwtSecret) as {
        userId: string;
      };

      const user = await UserModel.findById(decoded.userId);
      return user;
    } catch (error) {
      logger.warn({ error }, 'Token verification failed');
      return null;
    }
  }

  /**
   * Find or create user (for OAuth flows)
   */
  async findOrCreateUser(params: CreateUserParams): Promise<User> {
    const existingUser = await UserModel.findByAuthId(params.authProvider, params.authId);

    if (existingUser) {
      return existingUser;
    }

    return await UserModel.create(params);
  }
}

// Export singleton instance
export const userService = new UserService();
