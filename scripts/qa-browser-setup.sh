#!/usr/bin/env bash
set -euo pipefail

# Hosted Ubuntu's Azure mirror stalled actual QA jobs before any browser/native checks.
# Use official Ubuntu HTTPS archives; preserve suites, signatures and Playwright version.
test -r /etc/apt/apt-mirrors.txt
printf '%s\n' https://archive.ubuntu.com/ubuntu https://security.ubuntu.com/ubuntu | sudo tee /etc/apt/apt-mirrors.txt
sudo tee /etc/apt/apt.conf.d/99docx-next-downloads <<'APT'
Acquire::http::Timeout "30";
Acquire::https::Timeout "30";
Acquire::Retries "1";
Acquire::Languages "none";
APT
npx playwright install --with-deps chromium
