#!/usr/bin/bash

bun install
mkdir -p ~/.local/bin/syncthing-hooks
cp -r . ~/.local/bin/syncthing-hooks

mkdir -p ~/.config/systemd/user
cp syncthing-hooks.service ~/.config/systemd/user
systemctl --user enable --now syncthing-hooks
