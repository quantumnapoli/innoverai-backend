#!/usr/bin/env bash
set -euo pipefail

RETELL_KEY=${RETELL_KEY:-}
DATABASE_URL=${DATABASE_URL:-}

if [ -z "$RETELL_KEY" ]; then
  echo "RETELL_KEY not set" >&2
  exit 1
fi
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set" >&2
  exit 1
fi

echo "Fetching calls from Retell..."
RESP_FILE=$(mktemp)
curl -s -X POST "https://api.retellai.com/v2/list-calls" \
  -H "Authorization: Bearer $RETELL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":1000}' > "$RESP_FILE"

if ! jq empty "$RESP_FILE" >/dev/null 2>&1; then
  echo "Retell response not valid JSON or contains control chars; attempting to sanitize..." >&2
  # try to remove invalid control chars except newline/tab
  sed -e 's/[\x00-\x08\x0B\x0C\x0E-\x1F]//g' "$RESP_FILE" > "${RESP_FILE}.sanitized"
  mv "${RESP_FILE}.sanitized" "$RESP_FILE"
  if ! jq empty "$RESP_FILE" >/dev/null 2>&1; then
    echo "Failed to parse Retell JSON after sanitization" >&2
    exit 1
  fi
fi

TOTAL=$(jq 'length' "$RESP_FILE")
echo "Total retell calls: $TOTAL"

jq -c '.[]' "$RESP_FILE" | while read -r call; do
  CALL_ID=$(echo "$call" | jq -r '.call_id // empty')
  CALL_SUM=$(echo "$call" | jq -r '.call_analysis.call_summary // empty')
  DETAILED=$(echo "$call" | jq -r '.call_analysis.custom_analysis_data.detailed_call_summary // empty')

  if [ -z "$CALL_ID" ]; then
    echo "Skipping entry without call_id"
    continue
  fi
  # Only update if we have some summary
  if [ -z "$CALL_SUM" ] && [ -z "$DETAILED" ]; then
    continue
  fi

  # Use dollar-quoting to avoid escaping issues
  SQL="UPDATE calls SET call_summary = \$$CALL_SUM\$, detailed_call_summary = \$$DETAILED\$, updated_at = $(date +%s%3N) WHERE call_id = '$CALL_ID';"
  # But dollar quoting above is literal; instead use psql param via here-doc
  psql "$DATABASE_URL" <<-SQL || echo "Failed to update $CALL_ID" >&2
    UPDATE calls
    SET call_summary = 
        CASE WHEN '$CALL_SUM' = '' THEN call_summary ELSE '$CALL_SUM' END,
        detailed_call_summary = CASE WHEN '$DETAILED' = '' THEN detailed_call_summary ELSE '$DETAILED' END,
        updated_at = $(date +%s%3N)
    WHERE call_id = '$CALL_ID';
SQL

  echo "Patched $CALL_ID"
done

rm -f "$RESP_FILE"
echo "Done"


