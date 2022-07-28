pragma ever-solidity >=0.61.2;

interface IVotingResultRecipient {
    function isCompletedCallback(uint256, address, optional(bool), TvmCell) external;
}
