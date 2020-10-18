export interface PrivateUserData {
  steamId: string;
  websocketConnectionIds?: string[];
  emailAddress?: string;
  newTurnEmails?: boolean;
  webhookUrl?: string;
}
