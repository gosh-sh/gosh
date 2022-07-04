pragma ton-solidity >=0.54.0;
pragma AbiHeader time; 
pragma AbiHeader expire; 
pragma AbiHeader pubkey;

import "Libraries/SMVErrors.sol";
import "Libraries/SMVConstants.sol";

contract LockerPlatform  {

address public static tokenLocker;
uint256 public static platform_id;

modifier check_locker {
    require ( msg.sender == tokenLocker, SMVErrors.error_not_my_locker) ;
    _ ;
}

constructor (TvmCell clientCode, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell) public check_locker
{
    require(platform_id == tvm.hash(staticCell));
    tvm.accept();

    tvm.setcode (clientCode);
    tvm.setCurrentCode (clientCode);
    onCodeUpgrade (platform_id, amountToLock, staticCell, inputCell);
}


function onCodeUpgrade(uint256 _platform_id, uint128 amountToLock, TvmCell staticCell, TvmCell inputCell) private pure {
}


}