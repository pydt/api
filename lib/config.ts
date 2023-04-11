import * as AWSXRay from 'aws-xray-sdk';

class ConfigClass {
  public get activeStage() {
    return process.env.SERVERLESS_STAGE as string;
  }
  public get resourcePrefix() {
    return process.env.RESOURCE_PREFIX as string;
  }
  public get webUrl() {
    return process.env.WEB_URL as string;
  }
  public get jwtSecret() {
    return process.env.JWT_SECRET as string;
  }
  public get discourseApiKey() {
    return process.env.DISCOURSE_API_KEY as string;
  }
  public get steamApiKey() {
    return process.env.STEAM_API_KEY as string;
  }
  public get rollbarKey() {
    return process.env.ROLLBAR_API_KEY as string;
  }
  public get commitHash() {
    return process.env.COMMIT_HASH as string;
  }
  public get runningLocal() {
    return !!process.env.IS_OFFLINE;
  }
  public get vapidPrivateKey() {
    return process.env.VAPID_PRIVATE_KEY as string;
  }
  public get region() {
    return 'us-east-1';
  }
}

export const Config = new ConfigClass();

AWSXRay.setContextMissingStrategy(() => {
  // Ignore missing context (context will be set up by lambda)
});
