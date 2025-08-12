locals {
  s3_origin_id = "frontend-s3"
}

module "website_bucket" {
  source = "../private_s3_bucket"

  name_prefix_hyphenated = var.name_prefix_hyphenated
  name                   = "website"
  versioning_enabled     = false
}

resource "aws_cloudfront_distribution" "main" {
  wait_for_deployment = false
  comment             = var.comment

  origin {
    domain_name              = module.website_bucket.regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
    origin_id                = local.s3_origin_id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    cache_policy_id          = data.aws_cloudfront_cache_policy.managed_s3.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_s3.id
    compress                 = true

    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = var.basic_auth != null ? { once = true } : {}

      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.viewer_request.arn
      }
    }
  }

  # custom_error_response {
  #   error_caching_min_ttl = 0
  #   error_code            = 404
  #   response_code         = 404
  #   response_page_path    = "/404.html"
  # }

  price_class = "PriceClass_100"

  aliases = var.certificate != null ? var.certificate.domains : []
  viewer_certificate {
    cloudfront_default_certificate = var.certificate == null

    acm_certificate_arn      = var.certificate != null ? var.certificate.arn : null
    minimum_protocol_version = var.certificate != null ? "TLSv1.2_2021" : null
    ssl_support_method       = var.certificate != null ? "sni-only" : null
  }

  restrictions {
    geo_restriction {
      locations        = []
      restriction_type = "none"
    }
  }
}
