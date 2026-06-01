FROM debian:bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download and install the latest Walrus binary (for Mainnet)
RUN curl -sSf https://install.wal.app | sh -s -- -i /usr/local/bin -n mainnet

# Create the entrypoint script directly inside the image
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# 1. Fix the absolute paths in the yaml files to match the container'\''s volume path\n\
if [ -d "/wallets/walrus-sub-wallets" ]; then\n\
  echo "Fixing wallet configuration paths inside the container..."\n\
  sed -i "s|/Users/wahyutricahya/Hackathon/BlobCast/server/walrus-sub-wallets|/wallets/walrus-sub-wallets|g" /wallets/walrus-sub-wallets/*.yaml\n\
fi\n\
\n\
# 2. Create the default Sui config directory\n\
mkdir -p /root/.sui/sui_config\n\
\n\
# 3. Use sui_client_0.yaml as the default client.yaml if it exists\n\
if [ -f "/wallets/walrus-sub-wallets/sui_client_0.yaml" ]; then\n\
  cp /wallets/walrus-sub-wallets/sui_client_0.yaml /root/.sui/sui_config/client.yaml\n\
fi\n\
\n\
# 4. Start the real walrus publisher\n\
exec walrus publisher "$@"' > /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh

# Expose the publisher port
EXPOSE 31415

# Set entrypoint to run our startup script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["--bind-address", "0.0.0.0:31415", "--sub-wallets-dir", "/wallets/walrus-sub-wallets", "--wallet", "/wallets/walrus-sub-wallets/sui_client_0.yaml", "--config", "/wallets/walrus-sub-wallets/client_config.yaml", "--sub-wallets-min-balance", "50000000", "--gas-refill-amount", "50000000", "--wal-refill-amount", "50000000"]
