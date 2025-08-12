variable "name_prefix_hyphenated" {
  type     = string
  nullable = false
}

variable "certificate" {
  type = object({
    arn     = string
    domains = list(string)
  })
  nullable = true
}

variable "comment" {
  type     = string
  nullable = true
}

variable "basic_auth" {
  type = object({
    username = string
    password = string
  })
  nullable = true
  default  = null
}
