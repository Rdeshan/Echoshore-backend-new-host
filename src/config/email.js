const nodemailer = require('nodemailer');
const logger = require('./logger');
const dns = require('dns');

// Prefer IPv4 addresses when resolving hostnames where possible to avoid
// ENETUNREACH errors on platforms without IPv6 egress (some cloud hosts).
if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder('ipv4first');
    logger.info(
      'DNS result order set to ipv4first to prefer IPv4 for outgoing connections'
    );
  } catch (err) {
    logger.warn('Could not set DNS result order:', err.message);
  }
} else {
  logger.info('dns.setDefaultResultOrder not available on this Node version');
}

const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure =
  process.env.SMTP_SECURE != null
    ? process.env.SMTP_SECURE === 'true'
    : smtpPort === 465;
const smtpUser = process.env.GMAIL_USER;
const smtpPass = process.env.GMAIL_APP_PASSWORD;
const mailFrom = process.env.SMTP_FROM || smtpUser || 'noreply@ecoshore.com';

const hasSmtpCredentials = Boolean(smtpUser && smtpPass);

// Supports both generic SMTP (production) and Gmail fallback (local/dev).
const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      ...(smtpHost
        ? {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
          }
        : {
            service: 'gmail',
          }),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    })
  : null;

// Log transport summary (no secrets) to help debug deployment SMTP issues
try {
  if (transporter) {
    const transportType = smtpHost
      ? `SMTP ${smtpHost}:${smtpPort}`
      : 'Gmail service (smtp.gmail.com)';
    logger.info(
      `Email transporter configured: ${transportType}, EMAIL_ENABLED=${EMAIL_ENABLED}`
    );
  } else {
    logger.warn(
      'Email transporter not configured (missing credentials). Emails will be disabled.'
    );
  }
} catch (err) {
  // Swallow logging errors to avoid startup failure
  logger.warn('Failed to log email transporter configuration:', err.message);
}

/**
 * Send agent credentials email
 * @param {string} agentEmail - Agent's email address
 * @param {Object} agentData - Agent data containing name, email, and password
 */
const sendAgentCredentialsEmail = async (agentEmail, agentData) => {
  try {
    if (!EMAIL_ENABLED) {
      logger.warn('Email sending is disabled by EMAIL_ENABLED=false');
      return false;
    }

    if (!transporter) {
      logger.error(
        'Email transporter is not configured. Missing SMTP credentials.'
      );
      return false;
    }

    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:5175'
    ).replace(/\/+$/, '');

    const mailOptions = {
      from: mailFrom,
      to: agentEmail,
      subject: 'EcoShore Agent Account - Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to EcoShore</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">Hello ${agentData.name},</p>
            
            <p style="color: #555; line-height: 1.6;">
              Your agent account has been successfully created. Below are your login credentials to access the EcoShore system.
            </p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">Login Credentials</h3>
              <p style="margin: 10px 0;">
                <strong>Email:</strong> <span style="font-family: 'Courier New', monospace; color: #333;">${agentData.email}</span>
              </p>
              <p style="margin: 10px 0;">
                <strong>Password:</strong> <span style="font-family: 'Courier New', monospace; color: #333;">${agentData.password}</span>
              </p>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ Important:</strong> For security, please change your password on your first login.
              </p>
            </div>
            
            <div style="margin: 30px 0;">
              <a href="${frontendUrl}/login" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Login
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email. Please do not reply to this message.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center;">
              If you did not request this account, please contact the administrator.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Agent credentials email sent to ${agentEmail}`);
    return true;
  } catch (error) {
    logger.error(
      `Failed to send agent credentials email to ${agentEmail}:`,
      error
    );
    throw error;
  }
};

/**
 * Verify Gmail SMTP connection
 */
const verifyConnection = async () => {
  try {
    if (!EMAIL_ENABLED) {
      logger.warn('Email verification skipped because EMAIL_ENABLED=false');
      return false;
    }

    if (!transporter) {
      logger.error('Email verification failed: transporter is not configured');
      return false;
    }

    // Log target host/port before attempting verify (helps identify network/connectivity issues)
    try {
      const target = smtpHost
        ? `${smtpHost}:${smtpPort}`
        : 'gmail service (smtp.gmail.com)';
      logger.info(`Verifying SMTP connection to ${target}`);
    } catch (e) {
      logger.warn('Failed to compute SMTP target for verification logging');
    }

    await transporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('SMTP connection failed:', error);
    throw error;
  }
};

module.exports = {
  sendAgentCredentialsEmail,
  verifyConnection,
  transporter,
};
