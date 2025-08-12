resource "aws_service_discovery_service" "main" {
  name = "yagna"

  dns_config {
    namespace_id = var.service_discovery_namespace.id
    dns_records {
      ttl  = 10
      type = "A"
    }
  }
}
