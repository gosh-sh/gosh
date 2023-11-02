pragma ton-solidity >=0.54.0;
pragma AbiHeader expire; 
pragma AbiHeader pubkey;

import "./Libraries/SMVErrors.sol";
import "./Libraries/SMVConstants.sol";

contract LockerPlatform  {

//address public /* static */ tokenLocker;
uint256 public static platform_id;

/* modifier check_locker {
    require ( msg.sender == tokenLocker, SMVErrors.error_not_my_locker) ;
    _ ;
}
 */
//(clientCode, amountToLock, total_votes, staticCell, _inputCell)
constructor ( address goshdao, TvmCell clientCode, uint128 amountToLock, uint128 totalVotes, TvmCell staticCell, TvmCell inputCell, string[] isTag, address pubaddr) /* check_locker */
{
    require(platform_id == tvm.hash(staticCell));
    tvm.accept();

    tvm.setcode (clientCode);
    tvm.setCurrentCode (clientCode);
    onCodeUpgrade (isTag, pubaddr, goshdao, platform_id,  amountToLock, totalVotes, staticCell, inputCell);
}


function onCodeUpgrade(string[] /* isTag */,
                       address /* pubaddr */,
                       address /* goshdao */,
                       uint256 /* _platform_id */, 
                       uint128 /* amountToLock */, 
                       uint128 /* totalVotes */, 
                       TvmCell /* staticCell */, 
                       TvmCell /* inputCell */) private pure {
}


}
