import app from "./app";
import { logger } from "./lib/logger";
import { startMqttClient } from "./lib/mqtt";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  if (process.env.IOT_INGEST_MODE !== "webhook_only") {
    startMqttClient();
  } else {
    logger.info("IOT_INGEST_MODE is webhook_only, MQTT client will not start");
  }
});
