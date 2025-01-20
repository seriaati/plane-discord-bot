require("dotenv").config();

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  PLANE_API_KEY: process.env.PLANE_API_KEY,
  WORKSPACE_SLUG: process.env.WORKSPACE_SLUG,
  PROJECT_ID: process.env.PROJECT_ID,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ENABLE_FILE_LOGS: process.env.ENABLE_FILE_LOGS || "false",
};
