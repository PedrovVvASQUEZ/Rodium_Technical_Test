.DEFAULT_GOAL := help

.PHONY: help install setup db-up db-down db-migrate db-seed dev-backend dev-frontend test test-integration typecheck build check

help:
	@printf '%s\n' 'Commandes disponibles :' \
		'  make setup           Installe, demarre PostgreSQL, migre et seed la base' \
		'  make db-up           Demarre PostgreSQL' \
		'  make db-down         Arrete PostgreSQL' \
		'  make db-migrate      Applique les migrations' \
		'  make db-seed         Ajoute les 500 contacts de demonstration' \
		'  make dev-backend     Lance le backend NestJS' \
		'  make dev-frontend    Lance le frontend Vite' \
		'  make test            Lance les tests unitaires' \
		'  make test-integration Lance les tests PostgreSQL' \
		'  make typecheck       Verifie TypeScript' \
		'  make build           Construit backend et frontend' \
		'  make check           Lance typecheck, tests et build'

install:
	npm ci

setup: install db-up db-migrate db-seed

db-up:
	npm run db:up

db-down:
	npm run db:down

db-migrate:
	npm run db:migrate

db-seed:
	npm run db:seed

dev-backend:
	npm run dev:backend

dev-frontend:
	npm run dev:frontend

test:
	npm test

test-integration:
	npm run test:integration

typecheck:
	npm run typecheck

build:
	npm run build

check: typecheck test build