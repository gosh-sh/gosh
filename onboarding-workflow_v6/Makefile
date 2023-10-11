# TODO refactor
include .env

BRANCH ?= dev

.PHONY: docker
docker:
	rm -rf abi
	mkdir -p abi
	cp ../v6_x/v6.1.0/contracts/gosh/*.abi.json abi
	cp ../v6_x/v6.1.0/contracts/*.abi.json abi
	npm i
	if [ -z "$(GOSH_ENDPOINTS)" ]; then echo GOSH_ENDPOINTS required; exit 1; fi
	docker buildx build \
		--progress=plain \
		-t gosh-onboarding-v6 \
		--no-cache \
		--build-arg GOSH_ENDPOINTS=$(GOSH_ENDPOINTS) \
		--build-arg BRANCH=$(BRANCH) \
		.

.PHONY: fmt
fmt:
	npx prettier -w .

.PHONY: supabase_types
supabase_types:
	echo $(SUPABASE_ADMIN_URI)
	if test -z "$(SUPABASE_ADMIN_URI)"; then echo set SUPABASE_ADMIN_URI ; exit 1; fi
	mkdir -p src/db
	npx supabase gen types typescript --db-url $(SUPABASE_ADMIN_URI) > src/db/types.ts
	npx prettier -w src/db/types.ts
