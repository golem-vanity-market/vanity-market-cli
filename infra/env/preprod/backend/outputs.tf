output "ecr_prefix" {
  value = values(module.ecr)[0].url_prefix
}

output "ecr_url" {
  value = {
    for name, ecr in module.ecr : name => ecr.url
  }
}

output "ecr_arn" {
  value = {
    for name, ecr in module.ecr : name => ecr.arn
  }
}

output "backend_service_name" {
  description = "Name of the backend ECS service"
  value       = module.backend.service_name
}

output "backend_service_arn" {
  description = "ARN of the backend ECS service"
  value       = module.backend.service_arn
}

output "backend_log_group_name" {
  description = "Name of the backend CloudWatch log group"
  value       = module.backend.log_group_name
}

output "alb_domain" {
  value = module.backend_alb.dns_name
}

output "ssm_secret_parameter_names" {
  value = {
    "yagna" = module.yagna.ssm_secret_parameter_names
  }
}
