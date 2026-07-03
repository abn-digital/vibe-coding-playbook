# Observability

> Tier 1 alerts to Slack. Plan before apply.

## Logging by environment

| Environment | Logging |
|---|---|
| Local Docker | `json-file` (default) |
| POC Cloud Run | Native Cloud Logging (stdout JSON) |
| Product VM | `gcplogs` driver on every container |

Emit structured JSON from backend:

```json
{ "severity": "INFO", "message": "...", "uid": "..." }
```

## Health endpoint

`GET /api/health` - used by Docker healthchecks, Cloud Run probes, and GCP uptime checks.

```json
{ "status": "ok", "service": "api", "version": "0.1.0" }
```

## Ops Agent (product VMs only)

```yaml
# /etc/google-cloud-ops-agent/config.yaml
metrics:
  collection_interval: 1200s   # 20 minutes
```

## Tier 1 alerts (Slack only)

| Alert | POC | Product |
|---|---|---|
| Uptime check failed (`/api/health`) | ✅ | ✅ |
| Cloud Run 5xx > 5% | ✅ | - |
| GCE VM not reporting | - | ✅ |
| Disk usage > 85% | - | ✅ |
| Memory usage > 90% | - | ✅ |

Provisioned via Terraform - see [10-terraform.md](10-terraform.md).

## Uptime check target

**`/api/health` only** - not the SPA root. Static files can 200 while the API is dead.
