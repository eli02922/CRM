const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const leadRoutes = require('./modules/leads/leads.routes');
const customerRoutes = require('./modules/customers/customers.routes');
const opportunityRoutes = require('./modules/opportunities/opportunities.routes');
const activityRoutes = require('./modules/activities/activities.routes');
const reportRoutes = require('./modules/reports/reports.routes');
const supportCaseRoutes = require('./modules/supportCases/supportCases.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Basic protection against brute-force login attempts.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter, authRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/leads', leadRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/support-cases', supportCaseRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
