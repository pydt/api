import { Game } from '../../../lib/models';

export interface GamesByUserResponse {
  data: Game[];
  pollUrl: string;
}

export interface SetNotificationEmailBody {
  emailAddress: string;
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
