# Terraform

> All GCP resources via Terraform. Always plan before apply.

## Workflow

```bash
cd terraform/environments/product
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## Product environment

Use `template/terraform/environments/product/`:

- State prefix: `product/<app-name>`
- Alerts: uptime, VM down, disk > 85%, memory > 90%
- Set `gce_instance_id` from your `google_compute_instance` resource

## Slack channels

Lookup existing channel first (`create_slack_channel = false`). See [vibe-coding terraform doc](../vibe-coding/10-terraform.md).
