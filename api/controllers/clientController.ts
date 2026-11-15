import { Get, Route, Tags } from 'tsoa';
import { provideSingleton } from '../../lib/ioc';

/**
 * Remote switch for the desktop client's Rollbar reporting. The client fetches
 * this on startup and again every hour, so changes reach clients that are left
 * running without a client release. Edit CLIENT_ROLLBAR_CONFIG below and deploy
 * the API.
 */
export interface ClientRollbarConfig {
  // Master switch: false silences every client.
  enabled: boolean;
  // Clients older than this (semver, e.g. "2.3.0") don't report.
  minVersion?: string;
  // Extra messages to ignore (substring match), on top of the client's own list.
  ignoredMessages?: string[];
}

export const CLIENT_ROLLBAR_CONFIG: ClientRollbarConfig = {
  enabled: true,
  minVersion: '0.0.0',
  ignoredMessages: []
};

@Route('client')
@Tags('client')
@provideSingleton(ClientController)
export class ClientController {
  @Get('rollbarConfig')
  public rollbarConfig(): ClientRollbarConfig {
    return CLIENT_ROLLBAR_CONFIG;
  }
}
