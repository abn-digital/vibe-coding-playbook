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

## CI: Workload Identity Federation

Provision in the same Terraform environment:

- `google_iam_workload_identity_pool` + GitHub OIDC provider (`attribute.repository`)
- Deploy service account with `roles/iam.workloadIdentityUser` binding for the pool
- VM: enable OS Login (`enable-oslogin=TRUE` metadata) so CI deploys without a static SSH key

Wire GitHub Actions vars: `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`, `GCP_PROJECT`, `GCE_INSTANCE`, `GCE_ZONE`.
