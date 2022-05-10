import * as awssdk from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';

awssdk.config.update({ region: 'us-east-1' });

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
    return !!process.env.RUNNING_LOCAL;
  }
  public get vapidPrivateKey() {
    return process.env.VAPID_PRIVATE_KEY as string;
  }
}

export const Config = new ConfigClass();

export const AWS = Config.runningLocal ? awssdk : AWSXRay.captureAWS(awssdk);
