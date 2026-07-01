# Observability

> gcplogs, Ops Agent, Tier 1 Slack alerts. Terraform only.

## Production Docker logging

Use `docker-compose.prod.yml` with `gcplogs` on every service:

```yaml
x-logging: &gcplogs
  driver: gcplogs
  options:
    gcp-project: ${GCP_PROJECT_ID}
    gcp-log-cmd: "true"
    labels: app,service,environment
```

Local dev keeps `json-file` — never gcplogs locally.

## Ops Agent (GCE VM)

```yaml
metrics:
  collection_interval: 1200s   # 20 minutes
```

VM service account needs `roles/logging.logWriter`. Install [Ops Agent](https://cloud.google.com/monitoring/agent/ops-agent) on the instance.

## Tier 1 alerts (Slack)

| Alert | Condition |
|---|---|
| Uptime failed | `/api/health` HTTPS check |
| VM down | GCE instance not reporting |
| Disk > 85% | Ops Agent metric, 20m alignment |
| Memory > 90% | Ops Agent metric, 20m alignment |

Provision via `terraform/environments/product/` with `enable_vm_alerts = true`.

## Terraform workflow

Always `terraform plan` before `terraform apply`. See vibe-coding [10-terraform](../vibe-coding/10-terraform.md) for Slack channel lookup pattern.
