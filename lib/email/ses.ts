import * as AWS from 'aws-sdk';
const ses = new AWS.SES();
const templateHtml: string = require('./email.html');

export async function sendEmail(subject: string, bodyTitle: string, bodyHtml: string, toAddress: string): Promise<any> {
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
