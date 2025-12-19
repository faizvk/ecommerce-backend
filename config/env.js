import dotenv from "dotenv";

dotenv.config();

export const {
  PORT,
  MONGOOSE_URI,
  NODE_ENV,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  CLIENT_URL,
} = process.env;
