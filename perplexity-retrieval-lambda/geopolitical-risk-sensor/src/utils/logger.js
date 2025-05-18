/**
 * Logger utility for Geopolitical Risk Sensor
 * Provides consistent logging format across the application
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Create a logger instance for a specific service
 * @param {string} serviceName - Name of the service
 * @returns {winston.Logger} - Winston logger instance
 */
function createLogger(serviceName) {
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  );

  // Add service name to all log entries
  const formatWithService = winston.format((info) => {
    info.service = serviceName;
    return info;
  });

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      formatWithService(),
      logFormat
    ),
    defaultMeta: { service: serviceName },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      // File transport
      new winston.transports.File({
        filename: path.join(logsDir, 'sensor.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
      })
    ]
  });
}

module.exports = {
  createLogger
};
