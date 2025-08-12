resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = module.website_bucket.id
  policy = data.aws_iam_policy_document.allow_s3_access_to_cloudfront.json
}

data "aws_iam_policy_document" "allow_s3_access_to_cloudfront" {
  statement {
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${module.website_bucket.arn}/*",
    ]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}
