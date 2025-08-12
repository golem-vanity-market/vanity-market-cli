variable "hyphenated_prefix" {
  description = "Hyphenated prefix for resource naming"
  type        = string
  nullable    = false
}

variable "image" {
  description = "Docker image for the backend service"
  type        = string
  nullable    = false
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  nullable    = false
}

variable "service_discovery_namespace" {
  description = "Service discovery namespace name and ID"
  type = object({
    name = string
    id   = string
  })
  nullable = false
}

variable "task_role_arn" {
  description = "ARN of the task role"
  type        = string
  nullable    = false
}

variable "execution_role_arn" {
  description = "ARN of the execution role"
  type        = string
  nullable    = false

}

variable "vpc" {
  description = "VPC configuration"
  type = object({
    id         = string
    subnet_ids = list(string)
    cidr_block = string
  })
  nullable = false
}

variable "log_retention_in_days" {
  description = "Number of days to retain logs"
  type        = number
  nullable    = false
}

variable "desired_count" {
  description = "Desired number of running tasks"
  type        = number
  nullable    = false
}

variable "cpu" {
  description = "CPU units for the task"
  type        = number
  nullable    = false
}

variable "memory" {
  description = "Memory (MB) for the task"
  type        = number
  nullable    = false
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  nullable    = false
}

variable "load_balancer" {
  description = "Configuration of AWS Application Load Balancer"
  type = object({
    listener_arn = string
    host_header  = string
  })
  nullable = false
}
