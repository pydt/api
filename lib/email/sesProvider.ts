import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { provideSingleton } from '../ioc';
import { pydtLogger } from '../logging';
import templateHtml from './email.html';
import { Config } from '../config';

const ses = new SESClient({
  region: Config.region
});

export const SES_PROVIDER_SYMBOL = Symbol('ISesProvider');

export interface ISesProvider {
  sendEmail(subject: string, bodyTitle: string, bodyHtml: string, toAddress: string): Promise<void>;
}

@provideSingleton(SES_PROVIDER_SYMBOL)
export class SesProvider implements ISesProvider {
  public async sendEmail(subject: string, bodyTitle: string, bodyHtml: string, toAddress: string) {
    if (!toAddress.trim()) {
      return;
    }

    const email = new SendEmailCommand({
      Destination: {
        ToAddresses: [toAddress]
      },
      Message: {
        Body: {
          Html: {
            Data: templateHtml.replace('__TITLE__', bodyTitle).replace('__BODY__', bodyHtml)
          }
        },
        Subject: {
          Data: subject
        }
      },
      Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
    });

    pydtLogger.info(`Sending email ${subject} to ${toAddress}...`);

    try {
      const result = await ses.send(email);
      pydtLogger.info(`Email send succeeded with message ID: ${result.MessageId}`);
    } catch (err) {
      pydtLogger.error(`Email send failed!`, err);
    }
  }
}
