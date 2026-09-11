---
title: Authentication
description: Secure Inference Gateway with OpenID Connect (OIDC). Step-by-step Keycloak setup, JWT validation, token flows, and Kubernetes-friendly configuration. Covers AUTH_OIDC_ISSUER / AUTH_OIDC_CLIENT_ID / AUTH_OIDC_AUDIENCE on the Go gateway, the RFC 6750 WWW-Authenticate challenge, Entra ID / Google / Cognito / Auth0 / Okta settings, plus AUTH_ENABLED / AUTH_ISSUER_URL / AUTH_CLIENT_ID / AUTH_CLIENT_SECRET on the TypeScript ADK.
---

# Authentication

Inference Gateway supports authentication through OpenID Connect (OIDC), allowing you to secure your API with various identity providers. Keycloak is used as the worked example below; any provider that serves an OIDC discovery document works - see [Identity providers](#identity-providers).

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
AUTH_ENABLED=true
AUTH_OIDC_ISSUER=https://your-keycloak-instance/realms/your-realm
AUTH_OIDC_CLIENT_ID=your-client-id
# Optional: comma-separated list of accepted `aud` values. Empty means AUTH_OIDC_CLIENT_ID.
AUTH_OIDC_AUDIENCE=your-api-identifier
```

`AUTH_OIDC_ISSUER` and `AUTH_OIDC_CLIENT_ID` have no defaults: with `AUTH_ENABLED=true` and either one unset, the gateway fails at startup. Discovery runs once at boot against `{issuer}/.well-known/openid-configuration`, so an unreachable issuer also stops startup.

The gateway only verifies tokens against the issuer's public keys - it never requests one - so it needs no client secret. `AUTH_OIDC_CLIENT_SECRET` is not read by the gateway.

### Audience validation

`AUTH_OIDC_AUDIENCE` is the list of `aud` values a token may carry, comma-separated for providers that need more than one. When it is empty the gateway expects `AUTH_OIDC_CLIENT_ID`, which is what a Keycloak audience mapper puts in the token.

A token whose `aud` claim is **absent entirely** is accepted when its `client_id` claim matches one of the configured values. This is the check AWS documents for resource servers, and it is how Amazon Cognito machine-to-machine tokens work - they carry `client_id`, `token_use` and `scope`, but no `aud`.

The rest of this page documents the Go gateway. For agents built with the [TypeScript ADK](/typescript-adk#authentication), the same OIDC contract applies but the env-var names are different - see the cross-reference below.

### Env-var naming: Go gateway vs. TypeScript ADK

The Go gateway and the TypeScript ADK ship separately and each pins its own canonical config struct, so the env-var names differ even though the underlying OIDC flow is identical. Use the column that matches whichever surface you're configuring - don't share an `.env` between them without translating.

| Setting               | Go gateway                         | TypeScript ADK ([details](/typescript-adk#authentication)) |
| --------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Enable / disable      | `AUTH_ENABLED`                     | `AUTH_ENABLED`                                             |
| OIDC issuer URL       | `AUTH_OIDC_ISSUER`                 | `AUTH_ISSUER_URL`                                          |
| OAuth2 client id      | `AUTH_OIDC_CLIENT_ID`              | `AUTH_CLIENT_ID`                                           |
| Accepted `aud` values | `AUTH_OIDC_AUDIENCE`               | -                                                          |
| OAuth2 client secret  | not used (token verification only) | `AUTH_CLIENT_SECRET`                                       |

Both surfaces verify Bearer tokens against the issuer's JWKS, reject unauthenticated requests with HTTP `401` + `WWW-Authenticate: Bearer`, and keep their respective health endpoints public. The TypeScript ADK additionally returns a JSON-RPC `-32001` envelope on the JSON-RPC endpoint and leaves `/.well-known/agent-card.json` public so A2A clients can negotiate auth from the advertised security scheme.

## Identity providers

Nothing in the gateway is Keycloak-specific: any provider that serves an OpenID Connect discovery document works. Signature, issuer and expiry checks all come from that document. The only per-provider detail is what the provider's access tokens carry in `aud`, which must match one of the `AUTH_OIDC_AUDIENCE` values:

| Provider           | `AUTH_OIDC_ISSUER`                                          | `AUTH_OIDC_AUDIENCE`                                                                                  |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Keycloak           | `https://<host>/realms/<realm>`                             | the client id, added to access tokens by an audience mapper                                           |
| Microsoft Entra ID | `https://login.microsoftonline.com/<tenant-id>/v2.0`        | the API registration's client id (v2 tokens) or `api://<app-id>` (v1 tokens)                          |
| Google             | `https://accounts.google.com`                               | any URL you choose; the issuer is shared by every Google account, so pair it with a guardrails policy |
| Amazon Cognito     | `https://cognito-idp.<region>.amazonaws.com/<user-pool-id>` | the app client id; machine tokens carry no `aud`, so the gateway checks `client_id` instead           |
| Auth0              | `https://<tenant>.auth0.com/` (trailing slash)              | the API identifier; a token requested without an `audience` is opaque and cannot be verified          |
| Okta               | `https://<org>.okta.com/oauth2/<authorization-server-id>`   | the custom authorization server's audience (the org server issues opaque tokens)                      |

Opaque (non-JWT) tokens are not supported - the gateway does not perform RFC 7662 introspection.

### Runnable examples

Each identity provider ships as a Docker Compose example and a matching Kubernetes example in the [gateway repository](https://github.com/inference-gateway/inference-gateway):

| Provider           | Docker Compose                                                                                                            | Kubernetes                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Keycloak           | [`auth-keycloak`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/auth-keycloak) | [`auth-keycloak`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/auth-keycloak) |
| Microsoft Entra ID | [`auth-entra`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/auth-entra)       | [`auth-entra`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/auth-entra)       |
| Google             | [`auth-gcp`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/auth-gcp)           | [`auth-gcp`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/auth-gcp)           |
| Amazon Cognito     | [`auth-cognito`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/auth-cognito)   | [`auth-cognito`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/auth-cognito)   |

The three cloud examples hold only what differs from the Keycloak one - the `AUTH_*` values, an env template with the provider's ids, and a one-command `get-token.sh` - so read the Keycloak example first.

## Rejected requests

A rejected request gets HTTP `401` with a JSON body and an [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750#section-3) `WWW-Authenticate` challenge. The challenge tells you which case you hit:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="inference-gateway"
```

No `error` parameter means no bearer credentials were presented - the `Authorization` header was missing, used another scheme, or carried an empty token.

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="inference-gateway", error="invalid_token"
```

`error="invalid_token"` means a token was presented but failed verification: expired, malformed, signed by another issuer, or carrying the wrong audience.

The `Bearer` scheme is matched case-insensitively (`bearer <token>` works), but the scheme is required - a bare JWT with no scheme is rejected. `/health` stays public; every other endpoint requires a token when `AUTH_ENABLED=true`.

## Keycloak Integration

This section provides a detailed guide for integrating Keycloak with Inference Gateway.

### Prerequisites

- [Keycloak](https://www.keycloak.org/) server (v24.0.0 or later recommended)
- [Inference Gateway](https://github.com/inference-gateway/inference-gateway) (v0.23.1 or later)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) for Kubernetes deployment
- [Task](https://taskfile.dev/installation/) (optional, for running example tasks)

### Setting Up Keycloak

#### Option 1: Using the Authentication Example

Inference Gateway provides a complete example for setting up Keycloak authentication in a Kubernetes environment (for a laptop-sized version, use the [Docker Compose example](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/auth-keycloak) instead):

1. Clone the repository:

   ```bash
   git clone https://github.com/inference-gateway/inference-gateway.git
   cd inference-gateway/examples/kubernetes/auth-keycloak
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
     - Direct Access Grants (password grant): OFF
     - Save the changes

4. **Add an Audience Mapper**:
   - Go to "Client scopes" → `inference-gateway-client-dedicated` → "Add mapper" → "By configuration" → "Audience"
   - Included Client Audience: `inference-gateway-client`
   - Add to access token: ON, Add to ID token: OFF
   - Save

   Without this, Keycloak access tokens do not carry the client id in `aud` and the gateway rejects them. Limiting the mapper to access tokens means an ID token cannot be used as an API credential.

5. **Get Client Credentials**:
   - Go to the "Credentials" tab of your client
   - Copy the "Client Secret" - the caller needs it to request tokens; the gateway does not

### Configure Inference Gateway

Update your Inference Gateway configuration to enable authentication:

#### Using Environment Variables

```bash
AUTH_ENABLED=true
AUTH_OIDC_ISSUER=https://your-keycloak-instance/realms/inference-gateway-realm
AUTH_OIDC_CLIENT_ID=inference-gateway-client
```

#### Using Kubernetes ConfigMap

None of the gateway's OIDC settings are secrets - they are public identifiers - so a ConfigMap is enough:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inference-gateway
  namespace: inference-gateway
data:
  AUTH_ENABLED: 'true'
  AUTH_OIDC_ISSUER: https://your-keycloak-instance/realms/inference-gateway-realm
  AUTH_OIDC_CLIENT_ID: inference-gateway-client
  # Optional, defaults to AUTH_OIDC_CLIENT_ID
  AUTH_OIDC_AUDIENCE: inference-gateway-client
```

## Obtaining Access Tokens

To access the protected API, you need to obtain a JWT token from Keycloak. Use the client credentials grant, the flow an application or agent uses to call an API on its own behalf; [RFC 9700 §2.4](https://www.rfc-editor.org/rfc/rfc9700#section-2.4) says the resource owner password credentials grant MUST NOT be used.

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
3. **Scope the Audience**: Give the gateway its own audience value and set `AUTH_OIDC_AUDIENCE` to it, so a token minted for a different API in the same issuer is not accepted.
4. **Secret Management**: The gateway needs no client secret, but the callers requesting tokens do - store theirs using secure methods (e.g., Kubernetes Secrets, HashiCorp Vault).
5. **Client Roles**: Configure client roles in Keycloak to implement fine-grained access control. Authentication proves a token came from your issuer for your audience, not _which_ caller sent it; use guardrails policies on `input.identity` for per-caller authorization.
6. **Token Expiry**: Configure appropriate token lifetimes in Keycloak based on your security requirements.

## Troubleshooting

### Common Issues

1. **401 Unauthorized Errors**:
   - Read the `WWW-Authenticate` header first: no `error` parameter means no bearer token reached the gateway, `error="invalid_token"` means one did and failed verification (see [Rejected requests](#rejected-requests))
   - Check that the token hasn't expired
   - Verify that `AUTH_OIDC_ISSUER` exactly matches the token's `iss` claim, trailing slash included
   - Decode the token and check its `aud` against `AUTH_OIDC_AUDIENCE` (or `AUTH_OIDC_CLIENT_ID` when the audience is unset). With Keycloak, a missing [audience mapper](#option-2-manual-setup) is the usual cause; with Entra ID, a v1 token carries a `sts.windows.net` issuer instead of the `/v2.0` one

2. **Gateway Exits at Startup**:
   - `AUTH_ENABLED=true` requires both `AUTH_OIDC_ISSUER` and `AUTH_OIDC_CLIENT_ID`; neither has a default
   - OIDC discovery runs once at boot, so the issuer must be reachable before the gateway starts

3. **Certificate Issues**:
   - When using self-signed certificates, ensure Inference Gateway trusts Keycloak's certificate
   - Set `SSL_CERT_FILE` to point to the certificate location

4. **Clock Skew**:
   - Ensure server clocks are synchronized as JWT validation is time-sensitive

## Next Steps

After setting up authentication, consider:

- Implementing [Role-Based Access Control (RBAC)](https://www.keycloak.org/docs/latest/server_admin/#roles) in Keycloak
- Configuring [token exchange](https://www.keycloak.org/docs/latest/server_admin/#_token-exchange) for service-to-service communication
- Setting up [multi-factor authentication](https://www.keycloak.org/docs/latest/server_admin/#_otp-policies) for enhanced security
- Protecting an agent built on the [TypeScript ADK](/typescript-adk#authentication) with the same OIDC issuer (note the [different env-var names](#env-var-naming-go-gateway-vs-typescript-adk))
- Managing the gateway and its OIDC settings declaratively with the [Kubernetes Operator](/operator/#authentication-oidc) via `spec.auth.oidc`
