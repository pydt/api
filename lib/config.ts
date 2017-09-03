import * as AWS from 'aws-sdk';
AWS.config.update({ region: 'us-east-1' });

export class Config {
  public static activeStage() {
    return process.env.SERVERLESS_STAGE as string;
  }
  public static resourcePrefix() {
    return process.env.RESOURCE_PREFIX as string;
  }
  public static webUrl() {
    return process.env.WEB_URL as string;
  }
  public static jwtSecret() {
    return process.env.JWT_SECRET as string;
  }
  public static discourseApiKey() {
    return process.env.DISCOURSE_API_KEY as string;
  }
  public static steamApiKey() {
    return process.env.STEAM_API_KEY as string;
  }
  public static rollbarKey() {
    return process.env.ROLLBAR_API_KEY as string;
  }
}
