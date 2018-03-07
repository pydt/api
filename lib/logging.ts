import { Config } from './config';
import { Container } from 'inversify';
import { iocContainer } from './ioc';
import * as Rollbar from 'rollbar';

let rollbar: Rollbar;

function log(level: string, message, error?) {
  // tslint:disable-next-line
  console.log(message + ': ' + (error && error.stack ? error.stack : JSON.stringify(error)));

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

if (!Config.runningLocal()) {
  rollbar = new Rollbar({
    accessToken: Config.rollbarKey(),
    autoInstrument: false,
    reportLevel: 'warning',
    itemsPerMinute: 5,
    payload: {
      environment: Config.activeStage(),
      client: {
        javascript: {
          source_map_enabled: true,
          code_version: Config.commitHash(),
          guess_uncaught_frames: true
        }
      }
    }
  } as any);
}

export function loggingHandler(handler: (event, context, iocContainer: Container) => Promise<any>) {
  return async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    try {
      const resp = await handler(event, context, iocContainer);
      callback(null, resp);
    } catch (err) {
      pydtLogger.error('Handler threw unhandled exception...', err);
      const exposedError = new Error('Service Unavailable');

      if (rollbar) {
        (rollbar as any).wait(() => {
          callback(exposedError);
        });
      } else {
        callback(exposedError);
      }
    }
  }
}
