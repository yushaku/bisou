# Workers Issues

In the Cloudflare dashboard, create a Workers Issues notification for Bisou, set the occurrence threshold to 1, and send it to the PO's email address.

To check delivery, follow the [ADR 0018 PoC](adr/0018-backend-observability.md#poc-before-phase-3): deploy a throwaway Worker under a separate name with a temporary unhandled error, then request it and confirm that the issue appears and the email arrives. Remove the test Worker afterwards; do not add a test-error endpoint to production.
