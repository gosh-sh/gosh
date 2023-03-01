#!/bin/bash
for CONTRACT in "SMVAccount" "SMVTokenLocker" "LockerPlatform" "SMVClient" "SMVProposal" "TokenRootOwner"
do
	everdev sol compile "$CONTRACT.sol"
done