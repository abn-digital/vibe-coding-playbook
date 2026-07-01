# Terraform

Always **plan before apply** to catch drift:

```bash
cd terraform/environments/<poc|product>
terraform init
terraform plan -var-file=terraform.tfvars
# Review output, then:
terraform apply -var-file=terraform.tfvars
```

## Environments

| Directory | State prefix | Alerts |
|---|---|---|
| `environments/poc/` | `poc/<app-name>` | Uptime, Cloud Run 5xx |
| `environments/product/` | `product/<app-name>` | Uptime, VM down, disk > 85%, memory > 90% |

## State

- One GCS bucket per organization
- Separate prefix per environment

## Slack channels

Default `create_slack_channel = false` — Terraform looks up an existing channel first.
