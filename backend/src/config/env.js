require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildIntegrations() {
  const map = {};
  const prefix = 'INTEGRATIONS_';
  Object.keys(process.env).forEach((key) => {
    if (!key.startsWith(prefix)) return;
    const match = key.match(/^INTEGRATIONS_(.+)_(TOKEN|ENABLED|BASE_URL|CLIENT_ID|CLIENT_SECRET)$/);
    if (!match) return;
    const vendor = match[1].toLowerCase();
    const field = match[2].toLowerCase();
    if (!map[vendor]) map[vendor] = {};
    if (field === 'enabled') map[vendor].enabled = process.env[key] === 'true';
    else if (field === 'token') map[vendor].token = process.env[key];
    else map[vendor][field === 'base_url' ? 'baseUrl' : field] = process.env[key];
  });
  return map;
}

function getIntegration(name) {
  if (name === 'hubspot') {
    // Keep HubSpot backward-compatible with its dedicated variables.
    return {
      token: process.env.HUBSPOT_ACCESS_TOKEN || '',
      enabled: (process.env.HUBSPOT_ENABLED || 'false') === 'true',
    };
  }
  const cfg = buildIntegrations()[name.toLowerCase()] || {};
  return {
    token: cfg.token || '',
    enabled: cfg.enabled === true,
    baseUrl: cfg.baseUrl,
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
  };
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  hubspot: {
    token: process.env.HUBSPOT_ACCESS_TOKEN || '',
    enabled: (process.env.HUBSPOT_ENABLED || 'false') === 'true',
  },
  // Generic multi-vendor integration config. Each vendor is enabled via
  // INTEGRATIONS_<VENDOR>_ENABLED=true and INTEGRATIONS_<VENDOR>_TOKEN=...
  // (e.g. INTEGRATIONS_SALESFORCE_TOKEN).
  integrations: buildIntegrations(),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  getIntegration,
};
