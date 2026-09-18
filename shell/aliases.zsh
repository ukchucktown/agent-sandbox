# Portable aliases shared by the built-in and customized container shell.

# Better directory listings
if command -v eza >/dev/null 2>&1; then
  alias ls='eza --icons'
  alias ll='eza -lh --icons --git --no-user --no-time'
  alias la='eza -lah --icons --git --no-user --no-time'
  alias tree="eza -a --tree --level=3 --ignore-glob='.git|.DS_Store' --icons=auto"
  alias dtree="eza -a --tree --level=3 --ignore-glob='.git|.DS_Store' --icons=auto -D"
  (( $+functions[compdef] )) && compdef eza=ls
fi

# Better core utilities
if command -v bat >/dev/null 2>&1; then
  alias cat='bat'
fi
if command -v rg >/dev/null 2>&1; then
  alias grep='rg --color=auto'
fi
alias diff='diff --color=auto'
alias df='df -h'

# Navigation
alias -- -='cd -'

# Editor
if command -v nvim >/dev/null 2>&1; then
  alias vim='nvim'
fi

# Git
alias glog='PAGER="less -F -X" git log'
alias gadog='PAGER="less -F -X" git log --all --decorate --oneline --graph'
