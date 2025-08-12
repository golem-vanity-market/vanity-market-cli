output "internal_dns_name" {
  value = "${aws_service_discovery_service.main.name}.${var.service_discovery_namespace.name}"
}

output "capacity_provider_name" {
  value = aws_ecs_capacity_provider.yagna.name
}

output "ssm_secret_parameter_names" {
  value = { for k, v in aws_ssm_parameter.secret : k => v.name }
}
