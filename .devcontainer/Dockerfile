FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

ENV ZSH_CUSTOM=/home/node/.oh-my-zsh/custom \
    TASK_VERSION=v3.41.0

RUN apt-get update && \
    # Install GitHub CLI
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
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

USER node

# Use Powerlevel10k theme
RUN git clone --depth=1 https://github.com/romkatv/powerlevel10k.git /home/node/.powerlevel10k
RUN echo 'source /home/node/.powerlevel10k/powerlevel10k.zsh-theme' >> /home/node/.zshrc
RUN echo 'POWERLEVEL9K_DISABLE_CONFIGURATION_WIZARD=true' >> /home/node/.zshrc

# Configure Powerlevel10k
RUN echo 'POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(dir vcs)' >> /home/node/.zshrc && \
    echo 'POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(command_execution_time status)' >> /home/node/.zshrc && \
    echo 'POWERLEVEL9K_COMMAND_EXECUTION_TIME_THRESHOLD=0' >> /home/node/.zshrc && \
    echo 'POWERLEVEL9K_COMMAND_EXECUTION_TIME_PRECISION=2' >> /home/node/.zshrc && \
    echo 'POWERLEVEL9K_COMMAND_EXECUTION_TIME_FORMAT="duration"' >> /home/node/.zshrc


