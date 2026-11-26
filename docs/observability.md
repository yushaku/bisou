# Workers observability

Workers Issues groups backend errors. Configure email delivery through a Cloudflare Monitor that checks for at least one error-level log in five minutes. Use the first run of the alert setup script to check delivery with a temporary Worker. [ADR 0018 alert setup PoC](adr/0018-backend-observability.md#alert-setup-poc)

Remove the test Worker afterwards. Do not add a test-error endpoint to production.

`wrangler.jsonc` enables Workers traces at a sampling rate of 1. On Free, Workers Logs, Workers Traces and Issues share the 0.5 GB daily ingest allowance starting 1 December 2026. The ingest Monitor threshold is about 0.25 GB per day. Lower trace sampling if it fires. [Cloudflare Observability pricing](https://developers.cloudflare.com/observability/pricing/)
