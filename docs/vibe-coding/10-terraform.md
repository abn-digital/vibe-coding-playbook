# Terraform

> All GCP resources via Terraform. **Always plan before apply.**

## Workflow

```bash
cd terraform/environments/poc
terraform init
terraform plan -var-file=terraform.tfvars
# Review drift and unexpected changes
terraform apply -var-file=terraform.tfvars
```

**Never `apply` without a reviewed `plan`.**

## State backend

One GCS bucket per organization, **separate prefix per environment**:

| Environment | Prefix example |
|---|---|
| POC | `poc/my-app` |
| Product | `product/my-app` |

Each `terraform/environments/*/` directory owns its own `backend.tf`.

## Slack notification channels

Default: **lookup existing channel first**.

```hcl
variable "create_slack_channel" {
  default = false   # data source lookup
}
```

Set `create_slack_channel = true` only on first-time org setup, or `terraform import` an existing channel.

## Template

See [template/terraform/](../../template/terraform/) — `modules/monitoring` and `environments/poc/`.

## POC vs product environments

| Directory | Prefix | `enable_cloud_run_5xx_alert` | `enable_vm_alerts` |
|---|---|---|---|
| `environments/poc/` | `poc/<app>` | `true` | `false` |
| `environments/product/` | `product/<app>` | `false` | `true` (+ `gce_instance_id`) |

Copy `environments/poc/` to `environments/product/` when graduating — new prefix, new apply, new resources.
