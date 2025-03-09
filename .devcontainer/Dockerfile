FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

ENV ZSH_CUSTOM=/home/node/.oh-my-zsh/custom \
    TASK_VERSION=v3.41.0

RUN apt-get update && \
    # Install Task
    curl -s https://taskfile.dev/install.sh | sh -s -- -b /usr/local/bin ${TASK_VERSION} && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install global npm packages for TypeScript development
RUN npm install -g \
    semantic-release \
    @semantic-release/npm \
    @semantic-release/changelog \
    @semantic-release/git \
    @semantic-release/github \
    conventional-changelog-conventionalcommits

RUN git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM}/themes/powerlevel10k

USER node
