pragma ever-solidity >=0.59.0;

interface IVotingResultRecipient {
    function isCompletedCallback (uint256 /* _platform_id */ /* _tokenLocker */, optional (bool) completed, TvmCell /* data */ ) external;
/*     function isCompletedCallback(optional(bool)) external;
 */}