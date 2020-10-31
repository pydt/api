import { Game, User, PrivateUserData } from '../../../lib/models';

export interface GamesByUserResponse {
  data: Game[];
  pollUrl: string;
}

export interface CurrentUserDataWithPud {
  user: User;
  pud: PrivateUserData;
}

export interface SetNotificationEmailBody {
  emailAddress: string;
  newTurnEmails: boolean;
}

export interface SetWebhookUrlBody {
  webhookUrl: string;
}

export interface SetUserInformationBody {
  vacationMode?: boolean;
  timezone?: string;
  comments?: string;
}

export interface SetForumUsernameBody {
  forumUsername: string;
}

export interface SetSubstitutionPrefsBody {
  willSubstituteForGameTypes: string[];
}

export interface DeleteWebPushBody {
  endpoint: string;
}
