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

TMP=$(mktemp)
echo "Fetching calls from Retell into $TMP..."
curl -s -X POST "https://api.retellai.com/v2/list-calls" \
  -H "Authorization: Bearer $RETELL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":1000}' > "$TMP"

echo "Sanitizing JSON (remove control chars)"
sed -e 's/[\x00-\x08\x0B\x0C\x0E-\x1F]//g' "$TMP" > "${TMP}.san" && mv "${TMP}.san" "$TMP"

if ! jq empty "$TMP" >/dev/null 2>&1; then
  echo "Retell response not valid JSON after sanitization" >&2
  exit 1
fi

TOTAL=$(jq 'length' "$TMP")
echo "Total retell calls: $TOTAL"

COUNT=0
jq -c '.[]' "$TMP" | while read -r call; do
  CALL_ID=$(echo "$call" | jq -r '.call_id // empty')
  if [ -z "$CALL_ID" ]; then
    continue
  fi
  CALL_SUM_RAW=$(echo "$call" | jq -r '.call_analysis.call_summary // ""')
  DETAILED_RAW=$(echo "$call" | jq -r '.call_analysis.custom_analysis_data.detailed_call_summary // ""')

  # base64 encode safely, remove newlines
  if [ -n "$CALL_SUM_RAW" ]; then
    CALL_SUM_B64=$(printf "%s" "$CALL_SUM_RAW" | base64 | tr -d '\n')
  else
    CALL_SUM_B64=""
  fi
  if [ -n "$DETAILED_RAW" ]; then
    DETAILED_B64=$(printf "%s" "$DETAILED_RAW" | base64 | tr -d '\n')
  else
    DETAILED_B64=""
  fi

  # Only update if we have any summary
  if [ -z "$CALL_SUM_B64" ] && [ -z "$DETAILED_B64" ]; then
    continue
  fi

  SQL="UPDATE calls SET ";
  if [ -n "$CALL_SUM_B64" ]; then
    SQL+="call_summary = convert_from(decode('$CALL_SUM_B64','base64'),'UTF8'), "
  fi
  if [ -n "$DETAILED_B64" ]; then
    SQL+="detailed_call_summary = convert_from(decode('$DETAILED_B64','base64'),'UTF8'), "
  fi
  SQL+="updated_at = (extract(epoch from now())*1000)::bigint WHERE call_id = '"$(echo "$CALL_ID" | sed "s/'/''/g")"';"

  if psql "$DATABASE_URL" -c "$SQL" >/dev/null 2>&1; then
    echo "Patched $CALL_ID"
  else
    echo "Failed to patch $CALL_ID" >&2
  fi

  COUNT=$((COUNT+1))
  if [ $((COUNT % 50)) -eq 0 ]; then
    echo "Processed $COUNT/$TOTAL"
  fi
done

rm -f "$TMP"
echo "Done. Processed approx $COUNT entries."


