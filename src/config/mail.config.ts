import nodemailer from 'nodemailer';
import { config } from './env.config';
import logger from '../utils/logger';

/**
 * Mail Transporter Initialization
 * Uses SMTP settings from the environment configuration.
 */
export const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.port === 465, // true for 465, false for other ports
  auth: {
    user: config.mail.user,
    pass: config.mail.pass,
  },
});

/**
 * Verifies the SMTP connection and credentials.
 */
export const testMailConnection = async (): Promise<void> => {
  try {
    await transporter.verify();
    logger.info(`✅ Mail Server Connection Successful, Recipient: ${config.mail.from}`);
  } catch (error) {
    logger.error(`❌ Mail Server Connection Failed: ${(error as Error).message}`);
  }
};

export default transporter;
