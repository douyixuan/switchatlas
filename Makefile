.PHONY: dev-install build preview test clean

# Install dependencies
dev-install:
	npm install

# Prepare the data and build static site
build:
	node scripts/reorganize_vendors.js
	node scripts/build_static.js

# Serve the static site locally
preview: build
	@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	python3 -m http.server 8000 --directory dist
	
# simple test to check if config is valid
test: build
	@echo "Static build test passed"

# Clean up generated files and dependencies
clean:
	rm -rf node_modules temp_theremingoat dist
