import Client from '@infosimples/node_two_captcha';
import { config } from './config';

const twoCaptchaClient = new Client(config.captchaToken, {
  timeout: 60000,
  polling: 5000,
  throwErrors: true
});

export async function solveImageCaptcha(dataUrl: string): Promise<string> {
  const response = await twoCaptchaClient.decode({ base64: dataUrl });
  return response.text;
}
