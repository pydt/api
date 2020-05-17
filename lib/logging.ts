import { Container } from 'inversify';
import * as Rollbar from 'rollbar';
import { Config } from './config';
import { initContainer, iocContainer } from './ioc';

let rollbar: Rollbar;

function log(level: string, message, error?) {
  // tslint:disable-next-line
  console.log(`${message}${error ? (': ' + (error && error.stack ? error.stack : JSON.stringify(error))) : ''}`);

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
  info: function(message, error?) {
    log('info', message, error);
  },
  warn: function(message, error?) {
    log('warn', message, error);
  },
  error: function(message, error) {
    log('error', message, error);
  }
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
  } as any);
}

export function loggingHandler(handler: (event, context, iocContainer: Container) => Promise<any>) {
  return async (event, context) => {
    initContainer();

    context.callbackWaitsForEmptyEventLoop = false;

    try {
      return await handler(event, context, iocContainer);
    } catch (err) {
      pydtLogger.error('Handler threw unhandled exception...', err);
      const exposedError = new Error('Service Unavailable');

      if (rollbar) {
        (rollbar as any).wait(() => {
          throw exposedError;
        });
      } else {
        throw exposedError;
      }
    }
  }
}
