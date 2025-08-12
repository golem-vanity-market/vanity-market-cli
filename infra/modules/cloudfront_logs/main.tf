resource "aws_cloudwatch_log_group" "access_logs" {
  name              = "/cloudfront/${var.name_prefix_hyphenated}-access-logs"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_delivery_source" "access_logs" {
  name         = "${var.name_prefix_hyphenated}-logs"
  log_type     = "ACCESS_LOGS"
  resource_arn = var.cloudfront_distribution_arn
}

resource "aws_cloudwatch_log_delivery_destination" "access_logs" {
  name          = "${var.name_prefix_hyphenated}-logs"
  output_format = "plain"

  delivery_destination_configuration {
    destination_resource_arn = aws_cloudwatch_log_group.access_logs.arn
  }
}

resource "aws_cloudwatch_log_delivery" "access_logs" {
  delivery_source_name     = aws_cloudwatch_log_delivery_source.access_logs.name
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.access_logs.arn
}

