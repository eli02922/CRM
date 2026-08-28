/**
 * Parses `page` and `limit` query params into safe offset/limit values.
 * Defaults: page=1, limit=20, capped at 100 to protect the database.
 */
function getPagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginatedResponse({ rows, total, page, limit }) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

module.exports = { getPagination, buildPaginatedResponse };
