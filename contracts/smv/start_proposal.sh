#!/bin/bash
#function startProposal (TvmCell platformCode, TvmCell proposalCode, uint256 propId, TvmCell propData, 
#                        uint32 startTime, uint32 finishTime)

DELTA_START=$((5*60))
DELTA_FINISH=$((3*60*60))
NOW=`date +%s`
START_TIME=$(($NOW+$DELTA_START))
FINISH_TIME=$(($NOW+$DELTA_FINISH))

everdev contract run SMVAccount startProposal -a $1 --input "platformCode:\"`./getimage.sh LockerPlatform.tvc`\",proposalCode:\"`./getimage.sh SMVProposal.tvc`\",propId:111,propData:\"\",startTime:$START_TIME,finishTime:$FINISH_TIME" --signer keys1 
