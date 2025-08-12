variable "name" {
  type     = string
  nullable = false
}

variable "name_prefix_hyphenated" {
  type     = string
  nullable = false
}

variable "immutable_tags" {
  type    = bool
  default = false
}

variable "scan_on_push" {
  type    = bool
  default = true
}

variable "force_delete" {
  type    = bool
  default = false
}

variable "delete_untagged_after_days" {
  type    = number
  default = 30
}

variable "limit_of_tagged_images_count" {
  type    = number
  default = null
}
