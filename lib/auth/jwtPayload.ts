export interface FerriteJwtPayload {
  userId: string;
  accountId: string;
  refreshToken: string;
}

export interface FullJwtPayload extends FerriteJwtPayload {
  iat: number;
}
