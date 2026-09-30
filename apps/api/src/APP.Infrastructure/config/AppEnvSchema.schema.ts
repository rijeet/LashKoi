import * as Joi from 'joi';

export const appEnvSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  UPSTASH_REDIS_REST_URL: Joi.string().uri().optional().allow(''),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().optional().allow(''),
  CORS_ORIGINS: Joi.string().default(
    'http://localhost:5173,http://127.0.0.1:5173',
  ),
  PUBLIC_SITE_URL: Joi.string().uri().default('http://localhost:5173'),
  SITEMAP_BASE_URL: Joi.string().uri().default('http://localhost:5173'),
  ADMIN_EMAIL: Joi.string().email().optional(),
  ADMIN_PASSWORD: Joi.string().min(8).optional(),
  SWAGGER_ENABLED: Joi.string().default('true'),
  ADMIN_POINTS_GEOJSON: Joi.string().optional(),
  GOVERNANCE_PARTNER_KEY: Joi.string().optional().allow(''),
  ADMIN_BULK_IMPORT_ENABLED: Joi.string().optional().allow(''),
});
