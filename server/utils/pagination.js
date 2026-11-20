// Optional ?page / ?limit for list endpoints that return a bare array (kept for
// backwards compatibility). The default cap stops unbounded responses; the total
// goes in the X-Total-Count header.
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function parsePaging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { parsePaging, DEFAULT_LIMIT, MAX_LIMIT };
