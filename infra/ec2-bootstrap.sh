#!/usr/bin/env bash
# One-time bootstrap for a fresh EC2 t3.small (Amazon Linux 2023) instance.
# Run as part of the instance's user-data, or manually over SSH.
set -euo pipefail

# --- Docker + Compose plugin ---
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
sudo mkdir -p "$DOCKER_CONFIG/cli-plugins"
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
sudo chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

# --- App directory ---
sudo mkdir -p /opt/shopplatform
sudo chown ec2-user:ec2-user /opt/shopplatform

echo "Bootstrap complete. Next steps:"
echo "1. Copy infra/docker-compose.prod.yml and infra/nginx/ to /opt/shopplatform"
echo "2. Create /opt/shopplatform/.env with the variables listed in DEPLOYMENT.md"
echo "3. aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com"
echo "4. Obtain the wildcard cert: docker compose run --rm certbot certbot certonly --dns-route53 -d myshops.com -d '*.myshops.com'"
echo "5. docker compose --env-file .env up -d"
