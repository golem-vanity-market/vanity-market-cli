output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.backend.name
}

output "service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.backend.id
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.backend.arn
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.backend.id
}

output "service_discovery_service_arn" {
  description = "ARN of the service discovery service"
  value       = aws_service_discovery_service.backend.arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.backend.name
}