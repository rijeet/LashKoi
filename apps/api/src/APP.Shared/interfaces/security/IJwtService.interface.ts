export interface AccessTokenClaims {
  sub: string;
  sid: string;
  role: string;
  email: string;
}

export interface RefreshTokenClaims {
  sub: string;
  sid: string;
}

export interface VerifiedJwtPayload {
  sub: string;
  sid: string;
  role?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface IJwtService {
  generateAccessToken(payload: AccessTokenClaims): string;
  generateRefreshToken(payload: RefreshTokenClaims): string;
  verifyToken(token: string, type: 'access' | 'refresh'): VerifiedJwtPayload;
}
