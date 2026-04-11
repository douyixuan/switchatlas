.PHONY: dev-install build build-legacy preview dev test clean

# Install dependencies
dev-install:
	npm install

# Build with Next.js (static export)
build:
	npx next build

# Legacy build (original static site generator)
build-legacy:
	node scripts/reorganize_vendors.js
	node scripts/build_static.js

# Dev server
dev:
	npx next dev

# Serve the static site locally
preview: build
	npx next start

# simple test to check if config is valid
test: build
	@echo "Static build test passed"

# Clean up generated files and dependencies
clean:
	rm -rf node_modules temp_theremingoat dist out .next
