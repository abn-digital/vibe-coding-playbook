variable "project_id" { type = string }
variable "app_name" { type = string }
variable "health_check_url" { type = string }
variable "slack_channel_display_name" { type = string }
variable "create_slack_channel" { type = bool }
variable "slack_channel_name" { type = string }
variable "slack_auth_token" { type = string }
variable "enable_cloud_run_5xx_alert" { type = bool }
variable "enable_vm_alerts" { type = bool }
variable "gce_instance_id" {
  type        = string
  default     = ""
  description = "GCE instance ID for VM down alert (product only)"
}

data "google_monitoring_notification_channel" "slack" {
  count        = var.create_slack_channel ? 0 : 1
  display_name = var.slack_channel_display_name
  type         = "slack"
}

resource "google_monitoring_notification_channel" "slack" {
  count        = var.create_slack_channel ? 1 : 0
  display_name = var.slack_channel_display_name
  type         = "slack"
  labels = {
    channel_name = var.slack_channel_name
  }
  sensitive_labels {
    auth_token = var.slack_auth_token
  }
}

locals {
  slack_channel_id = var.create_slack_channel ? google_monitoring_notification_channel.slack[0].id : data.google_monitoring_notification_channel.slack[0].id
}

resource "google_monitoring_uptime_check_config" "health" {
  display_name = "${var.app_name}-health"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/api/health"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = replace(replace(var.health_check_url, "https://", ""), "/api/health", "")
    }
  }
}

resource "google_monitoring_alert_policy" "uptime" {
  display_name = "${var.app_name}-uptime-failed"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failed"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.health.uptime_check_id}\""
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "120s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_NEXT_OLDER"
      }
    }
  }

  notification_channels = [local.slack_channel_id]
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_alert_policy" "cloud_run_5xx" {
  count        = var.enable_cloud_run_5xx_alert ? 1 : 0
  display_name = "${var.app_name}-cloud-run-5xx"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run 5xx rate > 5%"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      duration        = "300s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = [local.slack_channel_id]
}

resource "google_monitoring_alert_policy" "disk_usage" {
  count        = var.enable_vm_alerts ? 1 : 0
  display_name = "${var.app_name}-disk-85"
  combiner     = "OR"

  conditions {
    display_name = "Disk usage > 85%"
    condition_threshold {
      filter          = "metric.type=\"agent.googleapis.com/disk/percent_used\" AND resource.type=\"gce_instance\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"
      aggregations {
        alignment_period   = "1200s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [local.slack_channel_id]
}

resource "google_monitoring_alert_policy" "memory_usage" {
  count        = var.enable_vm_alerts ? 1 : 0
  display_name = "${var.app_name}-memory-90"
  combiner     = "OR"

  conditions {
    display_name = "Memory usage > 90%"
    condition_threshold {
      filter          = "metric.type=\"agent.googleapis.com/memory/percent_used\" AND resource.type=\"gce_instance\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.90
      duration        = "300s"
      aggregations {
        alignment_period   = "1200s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [local.slack_channel_id]
}

resource "google_monitoring_alert_policy" "vm_down" {
  count        = var.enable_vm_alerts && var.gce_instance_id != "" ? 1 : 0
  display_name = "${var.app_name}-vm-down"
  combiner     = "OR"

  conditions {
    display_name = "GCE VM not reporting uptime"
    condition_threshold {
      filter          = "metric.type=\"compute.googleapis.com/instance/uptime\" AND resource.type=\"gce_instance\" AND resource.labels.instance_id=\"${var.gce_instance_id}\""
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [local.slack_channel_id]
  alert_strategy {
    auto_close = "1800s"
  }
}
