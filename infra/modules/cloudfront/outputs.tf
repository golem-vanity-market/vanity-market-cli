output "bucket" {
  value = module.website_bucket
}

output "domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "hosted_zone_id" {
  value = aws_cloudfront_distribution.main.hosted_zone_id
}

output "arn" {
  value = aws_cloudfront_distribution.main.arn
}
