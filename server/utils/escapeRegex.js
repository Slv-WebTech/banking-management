// Escapes user input so it is matched literally inside a $regex query
// (prevents regex injection / ReDoS from the search parameters).
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
