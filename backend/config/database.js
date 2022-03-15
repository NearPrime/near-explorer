module.exports = {
  readOnlyIndexerDatabase: {
    dialect: "postgres",
    host: process.env.NEAR_INDEXER_DATABASE_HOST,
    database: process.env.NEAR_INDEXER_DATABASE_NAME,
    username: process.env.NEAR_INDEXER_DATABASE_USERNAME,
    password: process.env.NEAR_INDEXER_DATABASE_PASSWORD,
    logging: false,
  },
  readOnlyAnalyticsDatabase: {
    dialect: "postgres",
    host: process.env.NEAR_ANALYTICS_DATABASE_HOST,
    database: process.env.NEAR_ANALYTICS_DATABASE_NAME,
    username: process.env.NEAR_ANALYTICS_DATABASE_USERNAME,
    password: process.env.NEAR_ANALYTICS_DATABASE_PASSWORD,
    logging: false,
  },
  readOnlyTelemetryDatabase: {
    dialect: "postgres",
    host: process.env.NEAR_TELEMETRY_DATABASE_HOST,
    database: process.env.NEAR_TELEMETRY_DATABASE_NAME,
    username: process.env.NEAR_TELEMETRY_DATABASE_USERNAME,
    password: process.env.NEAR_TELEMETRY_DATABASE_PASSWORD,
    logging: false,
  },
  writeOnlyTelemetryDatabase: {
    dialect: "postgres",
    host: process.env.NEAR_WRITE_TELEMETRY_DATABASE_HOST,
    database: process.env.NEAR_WRITE_TELEMETRY_DATABASE_NAME,
    username: process.env.NEAR_WRITE_TELEMETRY_DATABASE_USERNAME,
    password: process.env.NEAR_WRITE_TELEMETRY_DATABASE_PASSWORD,
    logging: false,
    pool: { min: 0, max: 15 },
  },
};
