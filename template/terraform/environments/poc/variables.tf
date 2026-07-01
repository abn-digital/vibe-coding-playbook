variable "gcp_project_id" {
  type = string
}

variable "gcp_region" {
  type    = string
  default = "us-central1"
}

variable "app_name" {
  type = string
}

variable "health_check_url" {
  type        = string
  description = "Public URL for GET /api/health"
}

variable "slack_channel_display_name" {
  type    = string
  default = "alerts-slack"
}

variable "create_slack_channel" {
  type        = bool
  default     = false
  description = "Set true only when no Slack notification channel exists in GCP yet"
}

variable "slack_channel_name" {
  type    = string
  default = "#alerts"
}

variable "slack_auth_token" {
  type      = string
  sensitive = true
  default   = ""
}
