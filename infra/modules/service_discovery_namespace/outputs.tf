output "name_and_id" {
  value = {
    id   = aws_service_discovery_private_dns_namespace.internal.id
    name = aws_service_discovery_private_dns_namespace.internal.name
  }
}
