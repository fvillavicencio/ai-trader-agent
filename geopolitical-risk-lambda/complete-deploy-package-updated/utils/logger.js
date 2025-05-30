/**
 * Logger utility for Geopolitical Risk Sensor
 * Provides consistent logging format across the application
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Determine logs directory based on environment
// In Lambda, use /tmp for logs, otherwise use local logs directory
let logsDir = process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : path.join(__dirname, '../../logs');

// Log the directory being used
console.log(`Using logs directory: ${logsDir}`);

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory: ${logsDir}`);
  } catch (error) {
    console.error(`Failed to create logs directory: ${error.message}`);
    // In case of error, fallback to /tmp
    if (logsDir !== '/tmp') {
      console.log('Falling back to /tmp directory');
      logsDir = '/tmp';
    }
  }
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
