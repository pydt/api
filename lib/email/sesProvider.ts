import { AWS } from '../config';
import { provideSingleton } from '../ioc';
import { pydtLogger } from '../logging';
import templateHtml from './email.html';
const ses = new AWS.SES();

export const SES_PROVIDER_SYMBOL = Symbol('ISesProvider');

export interface ISesProvider {
  sendEmail(subject: string, bodyTitle: string, bodyHtml: string, toAddress: string): Promise<void>;
}

@provideSingleton(SES_PROVIDER_SYMBOL)
export class SesProvider implements ISesProvider {
  public async sendEmail(subject: string, bodyTitle: string, bodyHtml: string, toAddress: string) {
    const email = {
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
    };

    pydtLogger.info(`Sending email ${subject} to ${toAddress}...`);

    try {
      const result = await ses.sendEmail(email).promise();
      pydtLogger.info(`Email send succeeded with message ID: ${result.MessageId}`);
    } catch (err) {
      pydtLogger.error(`Email send failed!`, err);
    }
  }
}
