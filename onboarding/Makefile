include .env

.PHONY: docker
docker:
	mkdir -p abi
	cp ../contracts/gosh/*.abi.json abi
	npm i
	docker buildx build -t gosh-onboarding .

.PHONY: fmt
fmt:
	npx prettier -w .

.PHONY: supabase_types
supabase_types:
	echo $$SUPABASE_ADMIN_URI
	if test -z "$$SUPABASE_ADMIN_URI"; then echo set SUPABASE_ADMIN_URI ; exit 1; fi
	mkdir -p src/db
	npx supabase gen types typescript --db-url $$SUPABASE_ADMIN_URI > src/db/types.ts
	npx prettier -w src/db/types.ts
