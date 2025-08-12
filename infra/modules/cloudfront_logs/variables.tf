variable "name_prefix_hyphenated" {
  type     = string
  nullable = false
}

variable "cloudfront_distribution_arn" {
  type     = string
  nullable = false
}

variable "log_retention_in_days" {
  type     = number
  nullable = false
}
