# Workers observability

The PO reads backend errors in Workers Issues and checks cron and push activity in Workers Logs. Filter by `event = "cron_run"` and `slot` for cron outcomes. Automated alerting is deferred. [ADR 0018](adr/0018-backend-observability.md)

`wrangler.jsonc` enables Workers traces at a sampling rate of 1. On Free, Workers Logs, Workers Traces and Issues share the 0.5 GB daily ingest allowance starting 1 December 2026. Check usage in the Cloudflare dashboard. [Cloudflare Observability pricing](https://developers.cloudflare.com/observability/pricing/)

## Optional cron heartbeats

1. In Healthchecks.io, create five checks with **Cron** schedules. For each one, set the server time zone to `Asia/Ho_Chi_Minh` and the grace time to 10 minutes. [Healthchecks.io check configuration](https://healthchecks.io/docs/configuring_checks/#cron-schedules)

   | Slot | Period | Cron expression |
   |---|---|---|
   | `notes` | Every minute | `* * * * *` |
   | `07` | Daily at 07:00 | `0 7 * * *` |
   | `08` | Daily at 08:00 | `0 8 * * *` |
   | `20` | Daily at 20:00 | `0 20 * * *` |
   | `03` | Daily at 03:00 | `0 3 * * *` |

2. Copy each base HTTPS ping URL from `hc-ping.com` or `hchk.io` into a JSON object in place of the placeholders.

   ```json
   {
     "notes": "https://hc-ping.com/NOTES_CHECK_UUID",
     "07": "https://hc-ping.com/07_CHECK_UUID",
     "08": "https://hc-ping.com/08_CHECK_UUID",
     "20": "https://hc-ping.com/20_CHECK_UUID",
     "03": "https://hc-ping.com/03_CHECK_UUID"
   }
   ```

3. From the repository root, run `pnpm exec wrangler secret put HEALTHCHECKS_URLS` and paste the JSON at the prompt. The Worker sends an empty GET to the base URL on success or appends `/fail` on failure. It skips slots without a valid URL. [Healthchecks.io pinging API](https://healthchecks.io/docs/http_api/)

The ping URLs are credentials. Workers traces capture them in the outbound `url.full` attribute. [Workers trace attributes](https://developers.cloudflare.com/workers/observability/traces/spans-and-attributes/)

## Future push and queue Monitor queries

These examples are for later. Bisou currently uses the dashboard for manual review. The SQL examples use Manual time-range mode and the `bisou` Worker. Replace `<ACCOUNT_TAG>` with the account ID and preview the queries against the account's Workers Logs attributes before saving a Monitor. [Cloudflare Monitors](https://developers.cloudflare.com/notifications/monitors/#monitor-query), [SQL API dataset discovery](https://developers.cloudflare.com/analytics/sql-api/datasets/)

### Push failures over one hour

Compare `value > 0.05`. The denominator counts jobs processed by the consumer, including retried and dropped jobs. Windows with fewer than 10 processed jobs return zero.

```sql
SELECT if(
  SUM(attributes['batchSize']) >= 10,
  1.0 * (SUM(attributes['failed']) + SUM(attributes['gone'])) / SUM(attributes['batchSize']),
  0
) AS value
FROM logs.workersLogs
WHERE accountTag = '<ACCOUNT_TAG>'
  AND scriptName = 'bisou'
  AND timestamp >= NOW() - INTERVAL '1' HOUR
  AND attributes['event'] = 'queue_batch'
```

### Daily push acceptance

Compare `value < 0.98` over the preceding 24 hours. `sent` means a push service accepted the message. The denominator includes terminal outcomes. In the query preview, confirm that Workers Logs accepts `HAVING` and returns no row for a window without terminal outcomes.

```sql
SELECT 1.0 * SUM(attributes['sent'])
  / (SUM(attributes['sent']) + SUM(attributes['gone']) + SUM(attributes['failed']) + SUM(attributes['dropped'])) AS value
FROM logs.workersLogs
WHERE accountTag = '<ACCOUNT_TAG>'
  AND scriptName = 'bisou'
  AND timestamp >= NOW() - INTERVAL '1' DAY
  AND attributes['event'] = 'queue_batch'
HAVING SUM(attributes['sent']) + SUM(attributes['gone']) + SUM(attributes['failed']) + SUM(attributes['dropped']) > 0
```

### Batch lag over five minutes

Compare `value > 0` to find batches above 300,000 ms. Each batch records the nearest-rank p95 of message age when consumption starts. Lag includes retry backoff because retried messages keep their original expiry.

```sql
SELECT COUNT(*) AS value
FROM logs.workersLogs
WHERE accountTag = '<ACCOUNT_TAG>'
  AND scriptName = 'bisou'
  AND timestamp >= NOW() - INTERVAL '5' MINUTE
  AND attributes['event'] = 'queue_batch'
  AND attributes['lagP95Ms'] > 300000
```

### No consumer batch while jobs were enqueued

Check for `value = 0` in the batch query and a positive write count for the same 15-minute window. Use Queues Analytics for the `bisou` queue, or query `queueMessageOperationsAdaptiveGroups` filtered by the queue ID, window and `actionType: WriteMessage`. This check combines two sources, so it needs separate evaluation from a single-dataset Workers Logs Monitor. [Cloudflare Queues metrics](https://developers.cloudflare.com/queues/observability/metrics/#message-operations)

```sql
SELECT COUNT(*) AS value
FROM logs.workersLogs
WHERE accountTag = '<ACCOUNT_TAG>'
  AND scriptName = 'bisou'
  AND timestamp >= NOW() - INTERVAL '15' MINUTE
  AND attributes['event'] = 'queue_batch'
```
