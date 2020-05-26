export interface WebsocketConnectionKey {
  connectionId: string;
}

export interface WebsocketConnection extends WebsocketConnectionKey {
  steamId: string;
  establishedDate: Date;
}
