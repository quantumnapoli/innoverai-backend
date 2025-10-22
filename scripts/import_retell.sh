#!/usr/bin/env bash
set -euo pipefail

# One-shot importer: fetch calls from Retell and POST them to backend /api/calls using admin token
# Requires: curl, jq

RETELL_KEY="key_55495e28b2562e4f1e87b5010fde"
BACKEND_URL="https://innoverai-backend-production.up.railway.app"
ADMIN_USER="admin"
ADMIN_PASS="jament78#@"

echo "Logging in as admin to backend..."
ADMIN_TOKEN=$(curl -s -X POST "$BACKEND_URL/api/login" -H "Content-Type: application/json" -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" | jq -r .token)
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "Failed to obtain admin token" >&2
  exit 1
fi
echo "Admin token obtained"

echo "Fetching calls from Retell..."
RETELL_RESPONSE=$(curl -s -X POST "https://api.retellai.com/v2/list-calls" \
  -H "Authorization: Bearer $RETELL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":200}')

COUNT=$(echo "$RETELL_RESPONSE" | jq 'if type=="array" then length else 0 end')
echo "Retrieved $COUNT calls from Retell"

if [ "$COUNT" -eq 0 ]; then
  echo "No calls to import";
  exit 0
fi

echo "$RETELL_RESPONSE" | jq -c '.[]' | while read -r call; do
  call_id=$(echo "$call" | jq -r '.call_id // empty')
  start_ts=$(echo "$call" | jq -r '.start_timestamp // empty')
  end_ts=$(echo "$call" | jq -r '.end_timestamp // empty')
  duration_ms=$(echo "$call" | jq -r '.duration_ms // 0')
  from_number=$(echo "$call" | jq -r '.from_number // empty')
  to_number=$(echo "$call" | jq -r '.to_number // empty')
  agent_id=$(echo "$call" | jq -r '.agent_id // empty')
  agent_name=$(echo "$call" | jq -r '.agent_name // empty')
  call_status=$(echo "$call" | jq -r '.call_status // empty')
  transcript=$(echo "$call" | jq -r '.transcript // empty')
  total_cost=$(echo "$call" | jq -r '.total_cost // null')
  # New fields: call_summary and detailed_call_summary
  call_summary=$(echo "$call" | jq -r '.call_analysis.call_summary // empty')
  detailed_call_summary=$(echo "$call" | jq -r '.call_analysis.custom_analysis_data.detailed_call_summary // empty')

  # Converti timestamp Retell (millisecondi) in ISO 8601
  # start_timestamp e end_timestamp sono in millisecondi
  start_iso=""
  if [ -n "$start_ts" ] && [ "$start_ts" != "null" ] && [ "$start_ts" -gt 0 ]; then
    # Converti millisecondi in secondi per date
    start_sec=$(echo "$start_ts" | awk '{print int($0/1000)}')
    # Usa node per conversione precisa (compatibile macOS/Linux)
    start_iso=$(node -e "console.log(new Date(parseInt('$start_ts')).toISOString())" 2>/dev/null || echo "")
  fi
  
  end_iso=""
  if [ -n "$end_ts" ] && [ "$end_ts" != "null" ] && [ "$end_ts" -gt 0 ]; then
    end_sec=$(echo "$end_ts" | awk '{print int($0/1000)}')
    end_iso=$(node -e "console.log(new Date(parseInt('$end_ts')).toISOString())" 2>/dev/null || echo "")
  fi

  # duration_ms è già in millisecondi, converti in secondi
  duration_seconds=0
  if [ -n "$duration_ms" ] && [ "$duration_ms" != "null" ] && [ "$duration_ms" -gt 0 ]; then
    duration_seconds=$((duration_ms/1000))
  fi

  # Determine direction fallback
  direction="inbound"
  call_type=$(echo "$call" | jq -r '.call_type // empty')
  if [ "$call_type" = "phone_call" ] && [ -z "$from_number" ]; then
    direction="outbound"
  fi

  # Build payload
  # Build payload with nulls for missing timestamps
  payload=$(jq -n --arg call_id "$call_id" \
    --arg from_number "$from_number" \
    --arg to_number "$to_number" \
    --arg start_time "$start_iso" \
    --arg end_time "$end_iso" \
    --argjson duration_seconds "$duration_seconds" \
    --arg direction "$direction" \
    --arg status "$call_status" \
    --arg agent_id "$agent_id" \
    --arg agent_name "$agent_name" \
    --arg transcript "$transcript" \
    --argjson retell_total_cost "$total_cost" \
    --arg call_summary "$call_summary" \
    --arg detailed_call_summary "$detailed_call_summary" \
    '(
      {call_id:$call_id, from_number:$from_number, to_number:$to_number,
       start_time:(if $start_time=="" then null else $start_time end),
       end_time:(if $end_time=="" then null else $end_time end),
       duration_seconds:$duration_seconds, direction:$direction, status:$status, agent_id:$agent_id,
       cost_per_minute:null, retell_agent_id:$agent_id, retell_agent_name:$agent_name,
       retell_call_status:$status, retell_transcript:$transcript, retell_total_cost:$retell_total_cost,
       call_summary:(if $call_summary=="" then null else $call_summary end),
       detailed_call_summary:(if $detailed_call_summary=="" then null else $detailed_call_summary end)}
    )' )

  # POST to backend
  echo "Upserting call: $call_id"
  resp=$(curl -s -w "%{http_code}" -o /tmp/resp.json -X POST "$BACKEND_URL/api/calls" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$payload")

  http_code="$resp"
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "  OK ($http_code)"
  else
    echo "  ERROR $http_code -> $(cat /tmp/resp.json)"
  fi
done

echo "Import finished"


