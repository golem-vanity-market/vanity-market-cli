output "listener_arn" {
  value = aws_lb_listener.default.arn
}

output "dns_name" {
  value = aws_lb.alb.dns_name
}

output "lb_arn_suffix" {
  value = aws_lb.alb.arn_suffix
}

output "zone_id" {
  value = aws_lb.alb.zone_id
}
