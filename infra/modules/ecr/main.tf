resource "aws_ecr_repository" "registry" {
  name                 = "${var.name_prefix_hyphenated}-${var.name}"
  image_tag_mutability = var.immutable_tags ? "IMMUTABLE" : "MUTABLE"
  encryption_configuration {
    encryption_type = "AES256"
  }
  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }
}

resource "aws_ecr_lifecycle_policy" "autodelete" {
  repository = aws_ecr_repository.registry.name
  policy = jsonencode({
    rules = concat(
      var.delete_untagged_after_days != null ? [
        {
          rulePriority = 1
          description  = "Remove the untagged images older than ${var.delete_untagged_after_days} days"
          selection = {
            tagStatus   = "untagged"
            countType   = "sinceImagePushed"
            countUnit   = "days"
            countNumber = var.delete_untagged_after_days
          }
          action = {
            type = "expire"
          }
        }
      ] : [],
      var.limit_of_tagged_images_count != null ? [{
        rulePriority = 2
        description  = "Remove the tagged images when there are more than ${var.limit_of_tagged_images_count} of them"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = var.limit_of_tagged_images_count
        }
      }] : [],
    )
  })
}
