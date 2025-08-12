variable "name_prefix_hyphenated" {
  type     = string
  nullable = false
}

variable "name" {
  type     = string
  nullable = false
}

variable "vpc" {
  type = object({
    id         = string
    subnet_ids = list(string)
    cidr_block = string
  })
  nullable = false
}

variable "database_name" {
  type     = string
  nullable = false
}

variable "min_capacity" {
  type     = number
  nullable = false
}

variable "max_capacity" {
  type     = number
  nullable = false
}

variable "seconds_auto_pause" {
  type     = number
  nullable = true
}

variable "restore_from_snapshot" {
  type = object({
    snapshot_id    = string
    engine_version = string
  })
  nullable = true
  default  = null
}

variable "backup_retention_period_days" {
  type     = number
  nullable = false
}

variable "use_io_optimized_storage" {
  type        = bool
  description = "Set to `true` to pay more for compute and storage, but not pay for IOPS."
  nullable    = false
}
