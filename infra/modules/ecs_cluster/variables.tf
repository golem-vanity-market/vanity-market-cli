variable "name_prefix_hyphenated" {
  type     = string
  nullable = false
}

variable "name" {
  type     = string
  nullable = false
}

variable "extra_capacity_providers" {
  type     = list(string)
  nullable = true
  default  = []
}
