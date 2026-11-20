// Turns an axios error into the most specific user-facing message available:
// the first field-level validation message if the API sent one, else its message.
export function errorMessage(err, fallback) {
  const data = err?.response?.data;
  const first = Array.isArray(data?.errors) ? data.errors.find((e) => e?.msg)?.msg : null;
  return first || data?.message || fallback;
}
