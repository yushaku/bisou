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
