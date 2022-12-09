Usage:

./goshify.sh git_user_or_organization_name git_repository_name gosh_system_contract_addr gosh_dao_name gosh_repo_name

Pulls a repository from github and pushes it to gosh, iterating over all branches, creating DAO and repo in process if needed

./create-repo.sh gosh_system_contract_addr gosh_dao_name gosh_repo_name

Creates a repository in gosh under existing DAO

./create-dao.sh gosh_system_contract_addr gosh_dao_name

Creates a gosh organization (DAO) and configures access for owner
