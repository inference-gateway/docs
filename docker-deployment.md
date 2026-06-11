---
title: Docker Deployment
description: Run Inference Gateway with Docker and Docker Compose - a basic docker run, a layered Compose stack with MCP tool servers and Prometheus/Grafana monitoring, plus port, environment, and health-check reference.
---

# Docker Deployment

Docker and Docker Compose are the quickest ways to run Inference Gateway for local development, testing, and small-scale production. This guide expands on the [Getting Started](/getting-started/) quickstart with environment configuration, TLS, a layered Docker Compose stack (gateway, MCP tool servers, and a Prometheus + Grafana monitoring stack), and a configuration reference.

For multi-node, highly available Kubernetes deployments, manage the gateway declaratively with the [Kubernetes Operator](/operator/) instead.

## Prerequisites

- Docker Engine 24+ with the Compose v2 plugin (`docker compose`, not the legacy `docker-compose`).
- At least one provider API key (for example `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`). See [Supported Providers](/supported-providers/).

## Quick start with docker run

Pull the image and start the gateway, passing a single provider key inline:

```bash
docker pull ghcr.io/inference-gateway/inference-gateway:latest

docker run --rm -it \
  -p 8080:8080 \
  -e OPENAI_API_KEY=your_key_here \
  ghcr.io/inference-gateway/inference-gateway:latest
```

The gateway listens on `8080` and exposes `GET /health` for readiness checks:

```bash
curl http://localhost:8080/health
```

### Supplying configuration from a file

Inline `-e` flags do not scale past a key or two. Put your configuration in an env file and mount it instead:

```bash
# .env
ENVIRONMENT=production
SERVER_PORT=8080
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
```

```bash
docker run --rm -it \
  -p 8080:8080 \
  --env-file .env \
  ghcr.io/inference-gateway/inference-gateway:latest
```

See the [Configuration](/configuration/) guide for the full list of environment variables.

### Serving over TLS

The gateway can terminate TLS itself. Mount your certificate and key into the container and point the gateway at them:

```bash
docker run --rm -it \
  -p 8443:8443 \
  --env-file .env \
  -e SERVER_PORT=8443 \
  -e SERVER_TLS_CERT_PATH=/certs/tls.crt \
  -e SERVER_TLS_KEY_PATH=/certs/tls.key \
  -v "$(pwd)/certs:/certs:ro" \
  ghcr.io/inference-gateway/inference-gateway:latest
```

When `SERVER_TLS_CERT_PATH` and `SERVER_TLS_KEY_PATH` are unset, the gateway serves plain HTTP - terminate TLS at a reverse proxy or load balancer in that case.

## Docker Compose

The examples below mirror the canonical, runnable stacks in the gateway repository under [`examples/docker-compose`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose). Each is self-contained; combine the service blocks into a single `docker-compose.yml` when you want more than one layer.

### Gateway service

A minimal, production-shaped gateway service that reads provider keys from a `.env` file:

```yaml
# docker-compose.yml
services:
  inference-gateway:
    image: ghcr.io/inference-gateway/inference-gateway:latest
    env_file:
      - .env
    ports:
      - '8080:8080'
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.2'
          memory: 256M
    pull_policy: always
    restart: unless-stopped
```

Create the `.env` next to it with your provider keys (never commit this file):

```bash
# .env
ENVIRONMENT=production
SERVER_PORT=8080
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
```

Start it:

```bash
docker compose up -d
docker compose logs -f inference-gateway
```

### Adding MCP tool servers

To let models call tools through the [Model Context Protocol](/mcp/), run one or more MCP servers alongside the gateway and point `MCP_SERVERS` at them. This mirrors the [`examples/docker-compose/mcp`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/mcp) stack:

```yaml
# docker-compose.yml
services:
  inference-gateway:
    image: ghcr.io/inference-gateway/inference-gateway:latest
    ports:
      - '8080:8080'
    env_file:
      - .env
    environment:
      ENVIRONMENT: ${ENVIRONMENT:-development}
      MCP_ENABLE: ${MCP_ENABLE:-true}
      MCP_EXPOSE: ${MCP_EXPOSE:-true}
      MCP_SERVERS: ${MCP_SERVERS:-http://mcp-time-server:8081/mcp,http://mcp-search-server:8082/mcp,http://mcp-filesystem-server:8083/mcp}
    depends_on:
      - mcp-time-server
      - mcp-search-server
      - mcp-filesystem-server
    networks:
      - mcp-network

  mcp-time-server:
    build:
      context: ./time-server
      dockerfile: Dockerfile
    networks:
      - mcp-network

  mcp-search-server:
    build:
      context: ./search-server
      dockerfile: Dockerfile
    networks:
      - mcp-network

  mcp-filesystem-server:
    build:
      context: ./filesystem-server
      dockerfile: Dockerfile
    volumes:
      - ./filesystem-data:/tmp/mcp-files
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

The `mcp-*` services above are built from the example sources in [`examples/docker-compose/mcp`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/mcp) - clone that directory to get the `Dockerfile`s, or replace each `build:` block with your own MCP server image. Set `MCP_ENABLE=true` so the gateway connects to the servers, and `MCP_EXPOSE=true` to list the discovered tools over the API. See [MCP Integration](/mcp/) for the protocol details.

### Optional monitoring stack

Enable OpenTelemetry metrics on the gateway and scrape them with Prometheus, visualized in Grafana. This mirrors [`examples/docker-compose/monitoring`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/monitoring):

```yaml
# docker-compose.yml
services:
  inference-gateway:
    image: ghcr.io/inference-gateway/inference-gateway:latest
    env_file:
      - .env
    ports:
      - '8080:8080'
      - '9464:9464'
    environment:
      - TELEMETRY_ENABLE=true
      - TELEMETRY_METRICS_PORT=9464
    pull_policy: always
    restart: unless-stopped
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - monitoring
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
```

Create `prometheus.yml` next to the compose file so Prometheus scrapes the gateway's metrics port:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'inference-gateway'
    static_configs:
      - targets: ['inference-gateway:9464']
    scrape_interval: 5s
    metrics_path: /metrics
    scrape_timeout: 4s
```

Grafana is then reachable at `http://localhost:3000` (default credentials `admin` / `admin`) and Prometheus at `http://localhost:9090`. Change the Grafana admin password before exposing it anywhere. For dashboards and the metrics catalog, see [Observability](/observability/).

## Configuration reference

### Port mapping

| Container port | Service         | Purpose                                                      |
| -------------- | --------------- | ------------------------------------------------------------ |
| `8080`         | Gateway HTTP    | Chat completions API and `GET /health`.                      |
| `9464`         | Gateway metrics | Prometheus `/metrics`, exposed when `TELEMETRY_ENABLE=true`. |
| `9090`         | Prometheus      | Prometheus UI and query API (monitoring stack).              |
| `3000`         | Grafana         | Grafana UI (monitoring stack).                               |

### Key environment variables

| Variable                                                   | Description                                                                          | Default                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| `ENVIRONMENT`                                              | Runtime environment; affects log verbosity.                                          | `production`              |
| `SERVER_HOST` / `SERVER_PORT`                              | Address and port the gateway binds to.                                               | `0.0.0.0` / `8080`        |
| `SERVER_TLS_CERT_PATH` / `SERVER_TLS_KEY_PATH`             | Paths to the TLS certificate and key inside the container; HTTP when unset.          | empty                     |
| `TELEMETRY_ENABLE` / `TELEMETRY_METRICS_PORT`              | Enable OpenTelemetry metrics and set the metrics port.                               | `false` / `9464`          |
| `MCP_ENABLE` / `MCP_EXPOSE` / `MCP_SERVERS`                | Enable MCP, list discovered tools over the API, and the comma-separated server URLs. | `false` / `false` / empty |
| `AUTH_ENABLE`                                              | Require authentication on the API. See [Authentication](/authentication/).           | `false`                   |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, ... | Per-provider API keys. See [Supported Providers](/supported-providers/).             | empty                     |

This is a working subset; the [Configuration](/configuration/) guide documents every variable.

### Health checks

The gateway exposes `GET /health` on the server port (`8080` by default). Probe it from the host or a reverse proxy:

```bash
curl -f http://localhost:8080/health
```

The published image is built on `gcr.io/distroless/static-debian13`, which has no shell or `curl`/`wget` inside the container. A Compose `healthcheck:` that shells out will not work - probe `/health` from outside the container (a load balancer, the host, or a sidecar). On Kubernetes, the [Operator](/operator/) wires HTTP liveness and readiness probes for you.

## Upgrading and rolling back

To move to a newer gateway image, pull the new tag and recreate the services:

```bash
docker compose pull
docker compose up -d
```

Pin a specific version (rather than `latest`) in production so upgrades are deliberate and rollbacks are a one-line tag change:

```yaml
services:
  inference-gateway:
    image: ghcr.io/inference-gateway/inference-gateway:0.23.1
```

For per-version breaking changes and migration notes, see the gateway [release notes](https://github.com/inference-gateway/inference-gateway/releases). A dedicated upgrade and migration guide is in progress.

## Next steps

- Promote the same configuration to a cluster with the [Kubernetes Operator](/operator/).
- Connect tools and data sources with [MCP Integration](/mcp/).
- Wire dashboards and alerts with [Observability](/observability/).
