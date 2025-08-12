resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = var.hyphenated_prefix
  vpc  = var.vpc_id
}
