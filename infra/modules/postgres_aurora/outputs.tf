output "host" {
  value = aws_rds_cluster.postgres.endpoint
}

output "port" {
  value = aws_rds_cluster.postgres.port
}

output "master_user" {
  value = aws_rds_cluster.postgres.master_username
}

output "master_password_secret_arn" {
  value = aws_rds_cluster.postgres.master_user_secret
}

output "database_name" {
  value = aws_rds_cluster.postgres.database_name
}
