#!/bin/bash
set -e

echo "🚀 Installing Inertia..."

if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed."
    exit 1
fi
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is not installed."
    exit 1
fi
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed."
    exit 1
fi

INERTIA_HOME="$HOME/.inertia"
mkdir -p "$INERTIA_HOME/bin"
mkdir -p "$INERTIA_HOME/hooks"
mkdir -p "$INERTIA_HOME/config"

echo "Copying CLI..."
cp inertia-cli/inertia.py "$INERTIA_HOME/bin/inertia"
chmod +x "$INERTIA_HOME/bin/inertia"

echo "Copying pre-push hook..."
cp inertia-cli/pre-push "$INERTIA_HOME/hooks/pre-push"
chmod +x "$INERTIA_HOME/hooks/pre-push"

# Add to PATH
SHELL_RC=""
if [ -n "$BASH_VERSION" ] && [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "$ZSH_VERSION" ] && [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ]; then
    if ! grep -q "$INERTIA_HOME/bin" "$SHELL_RC"; then
        echo "export PATH=\"$INERTIA_HOME/bin:\$PATH\"" >> "$SHELL_RC"
        echo "✅ Added $INERTIA_HOME/bin to your PATH in $SHELL_RC."
        echo "   Please restart your terminal or run: source $SHELL_RC"
    fi
else
    echo "⚠️  Could not determine shell rc. Please add $INERTIA_HOME/bin to your PATH manually."
fi

echo "✅ Inertia installed. Run 'inertia init' to get started."
