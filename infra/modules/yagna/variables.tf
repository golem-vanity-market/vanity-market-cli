variable "hyphenated_prefix" {
  type     = string
  nullable = false
}

variable "ecs_cluster_name" {
  type     = string
  nullable = false
}

variable "vpc" {
  type = object({
    availability_zone = string
    subnet_ids        = list(string)
    id                = string
  })
}

variable "task_role_arn" {
  type     = string
  nullable = false
}

variable "execution_role_arn" {
  type     = string
  nullable = false
}

variable "image" {
  type     = string
  nullable = false
}

variable "log_retention_in_days" {
  type     = number
  nullable = false
}

variable "service_discovery_namespace" {
  type = object({
    name = string
    id   = string
  })
  nullable = false
}
