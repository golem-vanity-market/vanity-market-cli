output "url" {
  value = aws_ecr_repository.registry.repository_url
}

output "arn" {
  value = aws_ecr_repository.registry.arn
}

output "url_prefix" {
  value = trimsuffix(aws_ecr_repository.registry.repository_url, var.name)
}