export interface SteamProfile {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  vacationMode?: boolean;
  timezone?: string;
  comments?: string;
}
