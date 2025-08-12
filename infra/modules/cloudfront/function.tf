resource "aws_cloudfront_function" "viewer_request" {
  name    = "${var.name_prefix_hyphenated}-basic-auth"
  runtime = "cloudfront-js-2.0"
  publish = true
  code = var.basic_auth == null ? file("${path.module}/append_html_suffix.js") : templatefile("${path.module}/append_html_suffix_and_basic_auth.js.tftpl", {
    "valid_authorization_header" = "Basic ${base64encode("${var.basic_auth.username}:${var.basic_auth.password}")}"
  })
}
