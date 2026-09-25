# ============================================================
#  email-triage — Makefile
#  The same runs as the npm scripts, in Docker:
#    npm run evaluate        ->  make
#    npm run evaluate:dev    ->  make dev
#    npm run evaluate:local  ->  make local
#    npm run evaluate:cloud  ->  make cloud
# ============================================================

# --- Variables -----------------------------------------------

SHELL          := /bin/bash

# Uses the Ollama on this machine if the container can reach it; otherwise
# compose.ollama.yaml starts Ollama in a container as well.
# OLLAMA=host or OLLAMA=docker forces the choice.
# On Docker Desktop the container reaches the host's localhost. On Linux it
# arrives through Docker's bridge, which an Ollama listening only on 127.0.0.1
# (its default there) does not answer: so that is the address to try.
ifeq ($(shell uname -s),Linux)
OLLAMA_PROBE   := $(shell docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null)
else
OLLAMA_PROBE   := localhost
endif

# Probed once, and only by the targets that need Ollama: the first use
# replaces this definition with the result.
OLLAMA = $(eval OLLAMA := $(shell curl -sf -m 2 http://$(OLLAMA_PROBE):11434/api/version > /dev/null && echo host || echo docker))$(OLLAMA)

COMPOSE_host   := docker compose
COMPOSE_docker := docker compose -f compose.yaml -f compose.ollama.yaml

# compose.yaml runs the container as this user, so the reports it writes in
# runs/ belong to whoever ran make.
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g)

# Colors
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
CYAN   := \033[36m
RESET  := \033[0m
BOLD   := \033[1m

# One evaluation with Ollama. $(1): what is shown, $(2): arguments for src/evaluate.ts
define evaluate
	@test -n "$(COMPOSE_$(OLLAMA))" || { printf "$(RED)>>> OLLAMA must be host or docker, not \"$(OLLAMA)\"$(RESET)\n"; exit 1; }
	@printf "$(CYAN)>>> $(1), Ollama: $(OLLAMA)$(RESET)\n"
	@mkdir -p runs
	@$(COMPOSE_$(OLLAMA)) run --rm --build app $(2)
endef

# --- Phony targets -------------------------------------------

.PHONY: all dev local cloud down fclean help

# --- Evaluation ----------------------------------------------

all: ##@Run — Every solution on the test set
	$(call evaluate,Test set,data/test)

dev: ##@Run — Every solution on the dev set
	$(call evaluate,Dev set,data/dev)

local: ##@Run — Test set, rules and local model only (no Gemini quota)
	$(call evaluate,Test set / local only,data/test --local)

# No Ollama at all: never starts its container, whatever OLLAMA says.
cloud: ##@Run — Test set, rules and cloud model only (needs GEMINI_API_KEY)
	@printf "$(CYAN)>>> Test set / cloud only, no Ollama$(RESET)\n"
	@mkdir -p runs
	@$(COMPOSE_host) run --rm --build app data/test --cloud

# --- Cleanup -------------------------------------------------

down: ##@Cleanup — Stop the Ollama container (the downloaded model is kept)
	@printf "$(YELLOW)>>> Stopping containers...$(RESET)\n"
	@$(COMPOSE_docker) down --remove-orphans

fclean: ##@Cleanup — Remove containers, images (Ollama included) and the model volume
	@printf "$(RED)>>> Removing containers, images and the 4.7 GB model volume...$(RESET)\n"
	@$(COMPOSE_docker) down -v --rmi all --remove-orphans
	@printf "$(GREEN)>>> Cleanup complete.$(RESET)\n"

# --- Help ----------------------------------------------------

help: ##@Other — Show this help
	@printf "\n$(BOLD)Usage:$(RESET) make $(CYAN)[target]$(RESET) [OLLAMA=host|docker]\n"
	@awk -F '##@' \
		'/^[a-zA-Z_-]+:.*##@/ { \
		     split($$2, a, " — "); \
		     split($$1, b, ":"); \
		     if (a[1] != section) { printf "\n  $(BOLD)%s$(RESET)\n", a[1]; section=a[1] } \
		     printf "    $(CYAN)%-10s$(RESET) %s\n", b[1], a[2] \
		 }' \
		$(MAKEFILE_LIST)
	@printf "\n"
