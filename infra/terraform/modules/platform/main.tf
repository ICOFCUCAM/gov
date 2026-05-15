# Platform module: namespace + db secret + Helm release.
# Providers (kubernetes, helm) are passed in by the environment root so this
# module stays vendor-neutral.

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.10"
    }
  }
}

variable "environment" {
  type = string
}

variable "region" {
  type = string
}

variable "db_secret" {
  type      = string
  sensitive = true
}

variable "helm_values" {
  type = string
}

resource "kubernetes_namespace" "civicos" {
  metadata {
    name = "civicos"
    labels = {
      "app.kubernetes.io/part-of" = "civicos"
      region                      = var.region
    }
  }
}

resource "kubernetes_secret" "db" {
  metadata {
    name      = "civicos-db"
    namespace = kubernetes_namespace.civicos.metadata[0].name
  }
  data = {
    DATABASE_URL = var.db_secret
  }
  type = "Opaque"
}

resource "helm_release" "civicos" {
  name       = "civicos"
  namespace  = kubernetes_namespace.civicos.metadata[0].name
  chart      = "${path.module}/../../../helm/civicos"
  values     = [file(var.helm_values)]
  depends_on = [kubernetes_secret.db]
}

output "namespace" {
  value = kubernetes_namespace.civicos.metadata[0].name
}

output "ingress_host" {
  value = "civicos-${var.environment}.${var.region}.sovereign"
}
