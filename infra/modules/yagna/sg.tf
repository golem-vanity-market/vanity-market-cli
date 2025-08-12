resource "aws_security_group" "yagna" {
  name   = "${var.hyphenated_prefix}-yagna"
  vpc_id = var.vpc.id

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = local.api_port
    to_port          = local.api_port
    protocol         = "tcp"
    cidr_blocks      = [data.aws_vpc.vpc.cidr_block]
    ipv6_cidr_blocks = []
  }

  ingress {
    from_port        = local.golem_port
    to_port          = local.golem_port
    protocol         = "udp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}
