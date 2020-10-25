export interface PrivateUserData {
  steamId: string;
  websocketConnectionIds?: string[];
  emailAddress?: string;
  newTurnEmails?: boolean;
  webhookUrl?: string;
  webPushSubscriptions?: WebPushSubscription[];
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
