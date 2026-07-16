import { Container } from 'inversify';
import * as Rollbar from 'rollbar';
import { Config } from './config';
import { initContainer, iocContainer } from './ioc';

type LogLevel = 'info' | 'warn' | 'error';

let rollbar: Rollbar;

function log(level: LogLevel, message: Rollbar.LogArgument, error?: Rollbar.LogArgument) {
  console.log(
    `${message}${error ? ': ' + (error instanceof Error ? error.stack : JSON.stringify(error)) : ''}`
  );

  if (rollbar) {
    switch (level) {
      case 'info':
        rollbar.info(message, error);
        break;

      case 'warn':
        rollbar.warn(message, error);
        break;

      case 'error':
        rollbar.error(message, error);
    }
  }
}

export const pydtLogger = {
  info: (message: Rollbar.LogArgument, error?: Rollbar.LogArgument) => log('info', message, error),
  warn: (message: Rollbar.LogArgument, error?: Rollbar.LogArgument) => log('warn', message, error),
  error: (message: Rollbar.LogArgument, error: Rollbar.LogArgument) => log('error', message, error)
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
