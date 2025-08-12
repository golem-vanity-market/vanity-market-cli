resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.name_prefix_hyphenated}-s3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_origin_request_policy" "managed_s3" {
  name = "Managed-CORS-S3Origin"
}

data "aws_cloudfront_cache_policy" "managed_s3" {
  name = "Managed-CachingOptimized"
}
