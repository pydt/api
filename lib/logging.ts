import * as winston from 'winston';
import wr from 'winston-transport-rollbar';
import { Config } from './config';

export function configureLogging() {
  winston.configure({
    exitOnError: false,
    handleExceptions: true,
    transports: [
      new winston.transports.Console()
    ]
  });

  // wr isn't anything because of the weird way this transport is designed, but we need to
  // check for it to prevent webpack from tree-shaking :(
  if (!wr && Config.activeStage() && Config.activeStage() !== 'dev') {
    winston.add((winston.transports as any).Rollbar, {
      rollbarAccessToken: Config.rollbarKey(),
      rollbarConfig: {
        environment: Config.activeStage()
      },
      level: 'warn'
    });
  }
}
