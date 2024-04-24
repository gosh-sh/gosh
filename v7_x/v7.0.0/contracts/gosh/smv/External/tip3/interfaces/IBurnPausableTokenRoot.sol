pragma ton-solidity >= 0.57.0;
pragma AbiHeader expire;

interface IBurnPausableTokenRoot {

    /*
        @notice Pause/Unpause token burns
        @dev Can be called only by rootOwner
        @dev if paused, then all burned tokens will be bounced to TokenWallet
        @param paused
        @returns paused
    */
    function setBurnPaused(bool paused) external responsible returns (bool);

    /*
        @notice Get burn paused status
        @returns paused
    */
    function burnPaused() external view responsible returns (bool);
}
