export interface PydtJwtPayload {
  steamId: string;
}

export interface FullJwtPayload extends PydtJwtPayload {
  iat: number;
}
