locals {
  is_https = var.certificate_arn != null
  port     = local.is_https ? 443 : 80
  protocol = local.is_https ? "HTTPS" : "HTTP"
}

resource "aws_lb" "alb" {
  name               = var.name_prefix_hyphenated
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_allowing_http_and_https.id]
  subnets            = var.vpc.subnet_ids
}

resource "aws_security_group" "alb_allowing_http_and_https" {
  name   = "${var.name_prefix_hyphenated}-lb"
  vpc_id = var.vpc.id

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    description      = local.protocol
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    description      = local.protocol
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_lb_listener" "default" {
  load_balancer_arn = aws_lb.alb.arn
  port              = local.port
  protocol          = local.protocol
  ssl_policy        = local.is_https ? "ELBSecurityPolicy-TLS13-1-2-2021-06" : null
  certificate_arn   = var.certificate_arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = var.default_response.content_type
      message_body = var.default_response.message_body
      status_code  = tostring(var.default_response.status_code)
    }
  }

  tags = {
    Name = "${var.name_prefix_hyphenated}-${local.protocol}-alb-listener"
  }
}

resource "aws_lb_listener_certificate" "default_alternatives" {
  for_each = toset(var.alternative_certificate_arns)

  listener_arn    = aws_lb_listener.default.arn
  certificate_arn = each.value
}
