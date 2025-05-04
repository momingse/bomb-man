import pino from "pino";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { randomUUID } from "crypto";
import { default as pinoHttp } from "pino-http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const transport = pino.transport({
  targets: [
    {
      target: "pino/file",
      // options: { destination: `${__dirname}/../logs/server.log` },
    },
    {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  ],
});

const httpLoggerOptions = {
  // Reuse an existing logger instance
  logger: pino(),

  // Define a custom request id function
  genReqId: function (req, res) {
    const existingID = req.id ?? req.headers["x-request-id"];
    if (existingID) return existingID;
    const id = randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },

  // Define custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Set to `false` to prevent standard serializers from being wrapped.
  wrapSerializers: true,

  // Logger level is `info` by default
  // useLevel: "info",

  // Define a custom logger level
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return "warn";
    } else if (res.statusCode >= 500 || err) {
      return "error";
    } else if (res.statusCode >= 300 && res.statusCode < 400) {
      return "silent";
    }
    return "info";
  },

  // Define a custom success message
  customSuccessMessage: function (req, res) {
    if (res.statusCode === 404) {
      return "resource not found";
    }
    return `${req.method} completed`;
  },

  // Define a custom receive message
  customReceivedMessage: function (req, res) {
    return "request received: " + req.method;
  },

  // Define a custom error message
  customErrorMessage: function (req, res, err) {
    return "request errored with status code: " + res.statusCode;
  },

  // Override attribute keys for the log object
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "timeTaken",
  },

  // Define additional custom request properties
  customProps: function (req, res) {
    return {
      customProp: req.customProp,
      // user request-scoped data is in res.locals for express applications
      customProp2: res.locals.myCustomData,
    };
  },
};

const options = {
  timestamp: pino.stdTimeFunctions.isoTime,
};

const httpLogger = pinoHttp(httpLoggerOptions, transport);
const logger = pino(options, transport);

export { logger, httpLogger };
