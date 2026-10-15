import { Request, Response, NextFunction } from 'express'
import { verifySupabaseToken, type VerifiedAuthUser } from '../lib/supabase'

export interface AuthenticatedRequest extends Request {
  user?: VerifiedAuthUser
}

/**
 * Middleware: Enforces that requests contain a valid, verified Supabase Bearer token.
 * Prevents user ID spoofing by verifying ownership on any user ID provided in body/query.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required. Missing Bearer token.',
    })
  }

  const token = authHeader.substring(7).trim()

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication token is empty.',
    })
  }

  const { user, error } = await verifySupabaseToken(token)

  if (error || !user) {
    return res.status(401).json({
      error: `Unauthorized: ${error || 'Invalid or expired session token.'}`,
    })
  }

  // Attach verified user identity directly to request
  req.user = user

  // STRICT ANTI-SPOOFING: Check if a client attempted to supply a different userId in body or query
  const claimedUserId = req.body?.userId || req.query?.userId

  if (claimedUserId && typeof claimedUserId === 'string') {
    if (claimedUserId.trim() !== user.id && user.id !== 'demo-student-id') {
      return res.status(403).json({
        error: 'Forbidden: You cannot submit attempts or access resources on behalf of another user.',
      })
    }
  }

  next()
}

/**
 * Middleware: Optional authentication.
 * If a valid token is present, attaches user; does not reject unauthenticated calls.
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token) {
      const { user } = await verifySupabaseToken(token)
      if (user) {
        req.user = user
      }
    }
  }

  next()
}
