/**
 * User model and database operations
 */
import { query } from '../config/database';
import { User, AuthProvider } from '@jadeassist/shared';
import { logger } from '../utils/logger';

export interface CreateUserParams {
  email?: string;
  name?: string;
  authProvider: AuthProvider;
  authId: string;
}

export interface UpdateUserParams {
  email?: string;
  name?: string;
}

export class UserModel {
  /**
   * Create a new user
   */
  static async create(params: CreateUserParams): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (id, email, name, auth_provider, auth_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [params.email, params.name, params.authProvider, params.authId]
    );

    logger.info({ userId: result.rows[0].id }, 'User created');
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const result = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by auth provider and ID
   */
  static async findByAuthId(authProvider: AuthProvider, authId: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE auth_provider = $1 AND auth_id = $2',
      [authProvider, authId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update user
   */
  static async update(id: string, params: UpdateUserParams): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (params.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(params.email);
    }

    if (params.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(params.name);
    }

    if (updates.length === 0) {
      return await UserModel.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    logger.info({ userId: id }, 'User updated');
    return result.rows[0] || null;
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    logger.info({ userId: id }, 'User deleted');
    return (result.rowCount ?? 0) > 0;
  }
}
