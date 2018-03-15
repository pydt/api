import * as AWS from 'aws-sdk';
import { provideSingleton } from '../ioc';
const ses = new AWS.SES();
const templateHtml: string = require('./email.html');

export const SES_PROVIDER_SYMBOL = Symbol('ISesProvider');

export interface ISesProvider {
  sendEmail(subject: string, bodyTitle: string, bodyHtml: string, toAddress: string): Promise<any>;
}

@provideSingleton(SES_PROVIDER_SYMBOL)
export class SesProvider implements ISesProvider {
  public async sendEmail(subject: string, bodyTitle: string, bodyHtml: string, toAddress: string): Promise<any> {
    const email = {
      Destination: {
        ToAddresses: [
          toAddress
        ]
      },
      Message: {
        Body: {
          Html: {
            Data: templateHtml.replace('__TITLE__', bodyTitle).replace('__BODY__', bodyHtml)
          }
        }, Subject: {
          Data: subject
        }
      },
      Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
    };

    return ses.sendEmail(email).promise();
  };
}
