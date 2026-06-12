---
title: Deployment with Helm (Legacy)
description: Legacy Helm deployment guide for Inference Gateway. Helm is deprecated - deploy to Kubernetes with the Kubernetes Operator instead. Kept for existing chart installations.
---

# Deployment with Helm (Legacy)

::: warning DEPRECATED
Helm is deprecated as a deployment method, and the chart is being retired - it will no longer be published. Deploy to Kubernetes with the [Kubernetes Operator](/operator/) instead, which manages the gateway and related resources declaratively as Custom Resources.

This page is kept for existing Helm installations. If you are deploying fresh, follow the [Kubernetes Operator](/operator/) guide instead of this one.
:::

This guide explains how to deploy the Inference Gateway using the official Helm charts.

## Migrating to the Kubernetes Operator

Already running the gateway with Helm? Move to the Operator when convenient:

1. Install the Operator - apply the release manifest from [Installation](/operator/#installation).
2. Express your existing Helm values as a `Gateway` custom resource. The [Operator quick start](/operator/#quick-start-minimal-gateway) shows how providers, ingress, auth, and HPA map onto `spec`.
3. Apply the `Gateway`, wait for it to report healthy, then uninstall the chart with `helm uninstall inference-gateway --namespace inference-gateway`.

For the full set of `Gateway` fields, see the [Kubernetes Operator](/operator/) reference.

## Prerequisites

- Kubernetes cluster (v1.30+)
- Helm installed (v3.8+)
- kubectl configured to access your cluster

## Installation

### Basic Gateway Deployment

Install the chart directly from OCI registry:

```bash
helm upgrade --install inference-gateway oci://ghcr.io/inference-gateway/charts/inference-gateway \
  --namespace inference-gateway \
  --create-namespace \
  --version 0.23.1
```

To enable ingress for the basic deployment:

```bash
helm upgrade --install inference-gateway oci://ghcr.io/inference-gateway/charts/inference-gateway \
  --namespace inference-gateway \
  --create-namespace \
  --set ingress.enabled=true \
  --version 0.23.1
```

## TLS Certificate Management

### Option 1: Manual TLS Secret Creation

For production deployments, you can manually create a TLS secret with your certificates:

```bash
kubectl create secret tls inference-gateway-tls \
  --namespace inference-gateway \
  --cert=/path/to/tls.crt \
  --key=/path/to/tls.key
```

### Option 2: cert-manager (Recommended)

For production deployments, we recommend using [cert-manager](https://cert-manager.io/) to automate certificate management. This approach automates certificate issuance and renewal:

1. Install cert-manager if not already installed:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.17.1 \
  --set crds.enabled=true
```

2. Create an Issuer or ClusterIssuer (example with Let's Encrypt):

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

3. Update your Helm installation to use cert-manager annotations by adding the cert-manager.io/cluster-issuer annotation to your ingress configuration.

With this setup, cert-manager will automatically request and manage TLS certificates from Let's Encrypt.

## Configuration

To see the available configurations, run:

```bash
helm show values oci://ghcr.io/inference-gateway/charts/inference-gateway
```

## Upgrading

To upgrade an existing installation:

```bash
helm upgrade --install inference-gateway oci://ghcr.io/inference-gateway/charts/inference-gateway \
  --namespace inference-gateway \
  -f values.yaml \
  --version 0.23.1
```

## Uninstalling

To completely remove the installation:

```bash
helm uninstall inference-gateway --namespace inference-gateway

# Remove the namespace
kubectl delete namespace inference-gateway
```

## Checking Deployment Status

```bash
# Check running pods
kubectl get pods -n inference-gateway

# Check services
kubectl get svc -n inference-gateway

# Check ingress (if enabled)
kubectl get ingress -n inference-gateway
```

## Chart Sources

The Helm chart sources are available at:

- Gateway: [https://github.com/inference-gateway/inference-gateway/tree/main/charts/inference-gateway](https://github.com/inference-gateway/inference-gateway/tree/main/charts/inference-gateway)
