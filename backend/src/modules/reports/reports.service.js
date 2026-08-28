const pool = require('../../config/db');

/** Lead funnel counts + conversion rate over an optional date range. */
async function leadConversion({ from, to }) {
  const params = [];
  let where = '';
  if (from) {
    params.push(from);
    where += ` AND created_at >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND created_at <= $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM leads WHERE TRUE ${where} GROUP BY status`,
    params
  );

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {});
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const converted = counts.converted || 0;
  const conversionRate = total > 0 ? Number(((converted / total) * 100).toFixed(2)) : 0;

  return { total, byStatus: counts, converted, conversionRate };
}

/** Won/lost opportunity totals and win rate per sales rep. */
async function salesPerformance() {
  const { rows } = await pool.query(
    `SELECT u.id AS owner_id, u.name AS owner_name,
            COUNT(*) FILTER (WHERE o.stage = 'won')::int AS won_count,
            COUNT(*) FILTER (WHERE o.stage = 'lost')::int AS lost_count,
            COALESCE(SUM(o.amount) FILTER (WHERE o.stage = 'won'), 0)::numeric AS won_amount,
            COUNT(*)::int AS total_opportunities
     FROM opportunities o
     JOIN users u ON u.id = o.owner_id
     GROUP BY u.id, u.name
     ORDER BY won_amount DESC`
  );

  return rows.map((r) => ({
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    wonCount: r.won_count,
    lostCount: r.lost_count,
    wonAmount: Number(r.won_amount),
    totalOpportunities: r.total_opportunities,
    winRate:
      r.won_count + r.lost_count > 0
        ? Number(((r.won_count / (r.won_count + r.lost_count)) * 100).toFixed(2))
        : 0,
  }));
}

/** Activity volume per customer as a proxy for engagement, most-active first. */
async function customerEngagement({ limit = 10 } = {}) {
  const { rows } = await pool.query(
    `SELECT c.id AS customer_id, c.company_name,
            COUNT(a.id)::int AS activity_count,
            MAX(a.created_at) AS last_activity_at
     FROM customers c
     LEFT JOIN activities a ON a.customer_id = c.id
     GROUP BY c.id, c.company_name
     ORDER BY activity_count DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    customerId: r.customer_id,
    companyName: r.company_name,
    activityCount: r.activity_count,
    lastActivityAt: r.last_activity_at,
  }));
}

/** Monthly won-revenue trend for the last `months` months. */
async function revenueTrend({ months = 12 } = {}) {
  const { rows } = await pool.query(
    `SELECT to_char(date_trunc('month', updated_at), 'YYYY-MM') AS month,
            COALESCE(SUM(amount), 0)::numeric AS revenue
     FROM opportunities
     WHERE stage = 'won' AND updated_at >= date_trunc('month', now()) - ($1 || ' months')::interval
     GROUP BY 1
     ORDER BY 1`,
    [months]
  );
  return rows.map((r) => ({ month: r.month, revenue: Number(r.revenue) }));
}

async function summary() {
  const [{ rows: leadRows }, { rows: oppRows }, { rows: customerRows }, { rows: caseRows }] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM leads WHERE status != 'converted'"),
    pool.query("SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS pipeline_value FROM opportunities WHERE stage NOT IN ('won','lost')"),
    pool.query('SELECT COUNT(*)::int AS count FROM customers'),
    pool.query("SELECT COUNT(*)::int AS count FROM support_cases WHERE status IN ('open','in_progress')"),
  ]);

  return {
    openLeads: leadRows[0].count,
    openOpportunities: oppRows[0].count,
    pipelineValue: Number(oppRows[0].pipeline_value),
    totalCustomers: customerRows[0].count,
    openSupportCases: caseRows[0].count,
  };
}

module.exports = { leadConversion, salesPerformance, customerEngagement, revenueTrend, summary };
