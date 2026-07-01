module "monitoring" {
  source = "../../modules/monitoring"

  project_id                 = var.gcp_project_id
  app_name                   = var.app_name
  health_check_url           = var.health_check_url
  slack_channel_display_name = var.slack_channel_display_name
  create_slack_channel       = var.create_slack_channel
  slack_channel_name         = var.slack_channel_name
  slack_auth_token           = var.slack_auth_token
  enable_cloud_run_5xx_alert = false
  enable_vm_alerts           = true
  gce_instance_id            = var.gce_instance_id
}
