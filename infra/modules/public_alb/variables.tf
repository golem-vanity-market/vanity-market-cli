variable "name_prefix_hyphenated" {
  type     = string
  nullable = false
}

variable "vpc" {
  type = object({
    id         = string
    subnet_ids = list(string)
  })
}

variable "certificate_arn" {
  type     = string
  nullable = true
}

variable "alternative_certificate_arns" {
  type     = list(string)
  nullable = false
  default  = []
}

variable "default_response" {
  type = object({
    content_type = string
    message_body = string
    status_code  = number
  })
  default = {
    content_type = "text/plain"
    message_body = "Authorization Required"
    status_code  = 401
  }
  nullable = false
}
