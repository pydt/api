import { Container } from 'inversify';
import * as Rollbar from 'rollbar';
import { Config } from './config';
import { initContainer, iocContainer } from './ioc';

type LogLevel = 'info' | 'warn' | 'error';

let rollbar: Rollbar;

function log(
  level: LogLevel,
  message: Rollbar.LogArgument,
  error?: Rollbar.LogArgument,
  custom?: Rollbar.LogArgument
) {
  console.log(
    `${message}${error ? ': ' + (error instanceof Error ? error.stack : JSON.stringify(error)) : ''}${custom ? ' ' + JSON.stringify(custom) : ''}`
  );

  if (rollbar) {
    switch (level) {
      case 'info':
        rollbar.info(message, error, custom);
        break;

      case 'warn':
        rollbar.warn(message, error, custom);
        break;

      case 'error':
        rollbar.error(message, error, custom);
    }
  }
}

export const pydtLogger = {
  info: (message: Rollbar.LogArgument, error?: Rollbar.LogArgument, custom?: Rollbar.LogArgument) =>
    log('info', message, error, custom),
  warn: (message: Rollbar.LogArgument, error?: Rollbar.LogArgument, custom?: Rollbar.LogArgument) =>
    log('warn', message, error, custom),
  error: (message: Rollbar.LogArgument, error: Rollbar.LogArgument, custom?: Rollbar.LogArgument) =>
    log('error', message, error, custom)
};

if (!Config.runningLocal) {
  rollbar = new Rollbar({
    accessToken: Config.rollbarKey,
    autoInstrument: false,
    reportLevel: 'warning',
    itemsPerMinute: 5,
    payload: {
      environment: Config.activeStage,
      client: {
        javascript: {
          source_map_enabled: true,
          code_version: Config.commitHash,
          guess_uncaught_frames: true
        }
      }
    }
  });
}

export function loggingHandler<TResult>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (event: any, context: any, iocContainer: Container) => Promise<TResult>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (event: any, context: any): Promise<TResult> => {
    initContainer();

    context.callbackWaitsForEmptyEventLoop = false;

    try {
      return await handler(event, context, iocContainer);
    } catch (err) {
      const exposedError = new Error('Service Unavailable');

      if (rollbar) {
        rollbar.error(err as Rollbar.LogArgument, { event });
        await new Promise<void>(resolve => {
          rollbar.wait(() => resolve());
        });
      }

      throw exposedError;
    }
  };
}
