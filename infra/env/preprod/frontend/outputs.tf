output "cloudfront_dns_name" {
  value = module.cloudfront.domain_name
}

output "cloudfront_bucket" {
  value = module.cloudfront.bucket.id
}
