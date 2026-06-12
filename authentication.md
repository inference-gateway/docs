---
title: Authentication
description: Secure Inference Gateway with OpenID Connect (OIDC). Step-by-step Keycloak setup, JWT validation, token flows, and Kubernetes-friendly configuration. Covers AUTH_OIDC_ISSUER / AUTH_OIDC_CLIENT_ID / AUTH_OIDC_CLIENT_SECRET on the Go gateway, plus AUTH_ENABLE / AUTH_ISSUER_URL / AUTH_CLIENT_ID / AUTH_CLIENT_SECRET on the TypeScript ADK.
---

# Authentication

Inference Gateway supports authentication through OpenID Connect (OIDC), allowing you to secure your API with various identity providers. This guide focuses on setting up authentication with Keycloak, a popular open-source identity and access management solution.

## Overview

When authentication is enabled, all requests to the Inference Gateway API must include a valid JWT token in the Authorization header. This token is issued by your configured identity provider (IdP) and is validated by Inference Gateway to authenticate requests.

## Authentication Flow

1. Users authenticate with the identity provider (Keycloak)
2. The identity provider issues a JWT token
3. Client applications include this token in requests to Inference Gateway
4. Inference Gateway validates the token with the identity provider
5. If valid, the request is processed; otherwise, a 401 Unauthorized response is returned

## Configuration

To enable authentication on the **Go gateway** ([`inference-gateway/inference-gateway`](https://github.com/inference-gateway/inference-gateway)), set:

```bash
AUTH_ENABLE=true
AUTH_OIDC_ISSUER=https://your-keycloak-instance/realms/your-realm
AUTH_OIDC_CLIENT_ID=your-client-id
AUTH_OIDC_CLIENT_SECRET=your-client-secret
```

The rest of this page documents the Go gateway. For agents built with the [TypeScript ADK](/typescript-adk#authentication), the same OIDC contract applies but the env-var names are different - see the cross-reference below.

### Env-var naming: Go gateway vs. TypeScript ADK

The Go gateway and the TypeScript ADK ship separately and each pins its own canonical config struct, so the env-var names differ even though the underlying OIDC flow is identical. Use the column that matches whichever surface you're configuring - don't share an `.env` between them without translating.

| Setting                  | Go gateway                | TypeScript ADK ([details](/typescript-adk#authentication)) |
| ------------------------ | ------------------------- | ---------------------------------------------------------- |
| Enable / disable         | `AUTH_ENABLE`             | `AUTH_ENABLE`                                              |
| OIDC issuer URL          | `AUTH_OIDC_ISSUER`        | `AUTH_ISSUER_URL`                                          |
| OAuth2 client id (`aud`) | `AUTH_OIDC_CLIENT_ID`     | `AUTH_CLIENT_ID`                                           |
| OAuth2 client secret     | `AUTH_OIDC_CLIENT_SECRET` | `AUTH_CLIENT_SECRET`                                       |

Both surfaces verify Bearer tokens against the issuer's JWKS, reject unauthenticated requests with HTTP `401` + `WWW-Authenticate: Bearer`, and keep their respective health endpoints public. The TypeScript ADK additionally returns a JSON-RPC `-32001` envelope on the JSON-RPC endpoint and leaves `/.well-known/agent-card.json` public so A2A clients can negotiate auth from the advertised security scheme.

## Keycloak Integration

This section provides a detailed guide for integrating Keycloak with Inference Gateway.

### Prerequisites

- [Keycloak](https://www.keycloak.org/) server (v24.0.0 or later recommended)
- [Inference Gateway](https://github.com/inference-gateway/inference-gateway) (v0.23.1 or later)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) for Kubernetes deployment
- [Task](https://taskfile.dev/installation/) (optional, for running example tasks)

### Setting Up Keycloak

#### Option 1: Using the Authentication Example

Inference Gateway provides a complete example for setting up Keycloak authentication in a Kubernetes environment:

1. Clone the repository:

   ```bash
   git clone https://github.com/inference-gateway/inference-gateway.git
   cd inference-gateway/examples/kubernetes/authentication
   ```

2. Deploy the infrastructure (Keycloak, PostgreSQL, etc.):

   ```bash
   task deploy-infrastructure
   ```

3. Deploy Inference Gateway with authentication enabled:

   ```bash
   task deploy-inference-gateway
   ```

4. Get the Keycloak admin password:

   ```bash
   task keycloak-admin-password
   ```

5. Access the Keycloak admin console:
   - URL: `https://keycloak.inference-gateway.local`
   - Username: `temp-admin`
   - Password: (output from the previous command)

6. Test the authentication:

   ```bash
   curl -k -v -H "Authorization: Bearer $(task fetch-access-token)" https://api.inference-gateway.local/v1/models
   ```

#### Option 2: Manual Setup

If you're setting up Keycloak manually, follow these steps:

1. **Install Keycloak**:
   Follow the [official Keycloak installation guide](https://www.keycloak.org/getting-started/getting-started-zip) for your environment.

2. **Create a Realm**:
   - Log in to the Keycloak Admin Console
   - Click "Create Realm"
   - Enter "inference-gateway-realm" as the realm name
   - Click "Create"

3. **Create a Client**:
   - In your realm, go to "Clients" → "Create client"
   - Client ID: `inference-gateway-client`
   - Client Authentication: Enabled
   - Save the client
   - On the client settings page:
     - Access Type: confidential
     - Service Account Enabled: ON
     - Save the changes

4. **Get Client Credentials**:
   - Go to the "Credentials" tab of your client
   - Copy the "Client Secret"

5. **Create Test User** (optional):
   - Go to "Users" → "Add user"
   - Username: `user`
   - Email: `user@example.com`
   - Email Verified: ON
   - Save
   - Go to "Credentials" tab
   - Set password: `password`
   - Temporary: OFF
   - Save

### Configure Inference Gateway

Update your Inference Gateway configuration to enable authentication:

#### Using Environment Variables

```bash
AUTH_ENABLE=true
AUTH_OIDC_ISSUER=https://your-keycloak-instance/realms/inference-gateway-realm
AUTH_OIDC_CLIENT_ID=inference-gateway-client
AUTH_OIDC_CLIENT_SECRET=your-client-secret
```

#### Using Kubernetes ConfigMap and Secret

```yaml
# ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: inference-gateway
  namespace: inference-gateway
data:
  AUTH_ENABLE: 'true'
  AUTH_OIDC_ISSUER: https://your-keycloak-instance/realms/inference-gateway-realm

---
# Secret
apiVersion: v1
kind: Secret
metadata:
  name: inference-gateway
  namespace: inference-gateway
stringData:
  AUTH_OIDC_CLIENT_ID: inference-gateway-client
  AUTH_OIDC_CLIENT_SECRET: your-client-secret
type: Opaque
```

## Obtaining Access Tokens

To access the protected API, you need to obtain a JWT token from Keycloak:

### Password Grant Flow (Testing Only)

```bash
curl -k -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  "https://your-keycloak-instance/realms/inference-gateway-realm/protocol/openid-connect/token" \
  -d "grant_type=password" \
  -d "client_id=inference-gateway-client" \
  -d "client_secret=your-client-secret" \
  -d "username=user" \
  -d "password=password" | jq -r .access_token
```

### Client Credentials Flow (Service-to-Service)

```bash
curl -k -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  "https://your-keycloak-instance/realms/inference-gateway-realm/protocol/openid-connect/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=inference-gateway-client" \
  -d "client_secret=your-client-secret" | jq -r .access_token
```

## Making Authenticated Requests

Once you have the token, include it in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-inference-gateway/v1/models
```

## Self-Signed Certificates

When working with self-signed certificates (common in development environments), you need to make Inference Gateway trust the Keycloak certificate.

Create a ConfigMap holding the issuer's CA certificate:

```bash
kubectl create configmap keycloak-ca \
  -n inference-gateway \
  --from-literal=ca.crt="$(kubectl get secret keycloak-tls -n idp -o jsonpath='{.data.ca\.crt}' | base64 -d)"
```

Then reference it from the [Kubernetes Operator](/operator/#authentication-oidc): set `spec.auth.oidc.caCertRef` to the ConfigMap key holding the PEM CA, and the operator mounts the certificate into the gateway pod and points `SSL_CERT_FILE` at it for you - no need to wire it by hand.

## Best Practices

1. **Use HTTPS**: Always secure both your Keycloak and Inference Gateway instances with HTTPS.
2. **Token Validation**: Inference Gateway validates tokens with the OIDC issuer, ensuring they are legitimate.
3. **Secret Management**: Store sensitive information like client secrets using secure methods (e.g., Kubernetes Secrets, HashiCorp Vault).
4. **Client Roles**: Configure client roles in Keycloak to implement fine-grained access control.
5. **Token Expiry**: Configure appropriate token lifetimes in Keycloak based on your security requirements.

## Troubleshooting

### Common Issues

1. **401 Unauthorized Errors**:
   - Check that the token hasn't expired
   - Verify that AUTH_OIDC_ISSUER is correct
   - Ensure the client secret is valid

2. **Certificate Issues**:
   - When using self-signed certificates, ensure Inference Gateway trusts Keycloak's certificate
   - Set `SSL_CERT_FILE` to point to the certificate location

3. **Clock Skew**:
   - Ensure server clocks are synchronized as JWT validation is time-sensitive

## Next Steps

After setting up authentication, consider:

- Implementing [Role-Based Access Control (RBAC)](https://www.keycloak.org/docs/latest/server_admin/#roles) in Keycloak
- Configuring [token exchange](https://www.keycloak.org/docs/latest/server_admin/#_token-exchange) for service-to-service communication
- Setting up [multi-factor authentication](https://www.keycloak.org/docs/latest/server_admin/#_otp-policies) for enhanced security
- Protecting an agent built on the [TypeScript ADK](/typescript-adk#authentication) with the same OIDC issuer (note the [different env-var names](#env-var-naming-go-gateway-vs-typescript-adk))
- Managing the gateway and its OIDC settings declaratively with the [Kubernetes Operator](/operator/#authentication-oidc) via `spec.auth.oidc`
