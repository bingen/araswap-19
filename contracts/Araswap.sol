pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract Araswap is AragonApp {
    using SafeMath for uint256;

    string private constant ERROR_ZERO_VALUE = "ARASWAP_ZERO_VALUE";
    string private constant ERROR_ZERO_TOKENS = "ARASWAP_ZERO_TOKENS";
    string private constant ERROR_TOKEN_TRANSFER_FAILED = "ARASWAP_TOKEN_TRANSFER_FAILED";
    string private constant ERROR_NOT_ENOUGH_VALUE = "ARASWAP_NOT_ENOUGH_VALUE";

    // This is the source of truth, we keep track of it to avoid anybody can
    // modify the ratio by sending eth or tokens to the contract
    // (although it'd be certainly stupid, as they would be lost funds)
    uint256 ethValue;
    uint256 tokenValue;
    uint256 currentRatio;

    mapping(address => uint256) ethHoldings;
    mapping(address => uint256) tokenHoldings;

    /// Events
    event AddedToPool(address sender, uint256 ethValue, uint256 tokenAmount);

    /// State
    ERC20 public token;

    /// ACL
    bytes32 constant public POOL_ROLE = keccak256("POOL_ROLE");

    function initialize(ERC20 _token) public onlyInit {
        initialized();

        token = _token;
    }

    /**
     * @notice Add `msg.value` ETH and `_tokenAmount` tokens to pool
     * @param _tokenAmount Tokens added to pool
     */
    function addToPool(uint256 _tokenAmount) external payable auth(POOL_ROLE) {
        require(msg.value > 0, ERROR_ZERO_VALUE);
        require(_tokenAmount > 0, ERROR_ZERO_TOKENS);

        ethValue = ethValue.add(msg.value);
        tokenValue = tokenValue.add(_tokenAmount);

        ethHoldings[msg.sender] = ethHoldings[msg.sender].add(msg.value);
        tokenHoldings[msg.sender] = tokenHoldings[msg.sender].add(_tokenAmount);

        currentRatio = ethValue.mul(tokenValue);

        emit AddedToPool(msg.sender, msg.value, _tokenAmount);
    }

    function sellTokens(uint256 _tokenAmount) external {
        require(_tokenAmount > 0, ERROR_ZERO_TOKENS);

        uint256 newTokenValue = tokenValue.add(_tokenAmount);
        uint256 newEthValue = currentRatio / newTokenValue;
        uint256 ethAmount = ethValue.sub(newEthValue);
        ethValue = newEthValue;

        // send ETH
        msg.sender.transfer(ethAmount);
        // get tokens
        require(token.safeTransferFrom(msg.sender, address(this), _tokenAmount), ERROR_TOKEN_TRANSFER_FAILED);
    }

    function buyTokens(uint256 _tokenAmount) external payable {
        require(msg.value > 0, ERROR_ZERO_VALUE);
        require(_tokenAmount > 0, ERROR_ZERO_TOKENS);

        uint256 newTokenValue = tokenValue.sub(_tokenAmount);
        uint256 newEthValue = currentRatio / newTokenValue;
        uint256 ethAmount = newEthValue.sub(ethValue);
        uint256 extraEth = msg.value - ethAmount;
        require(extraEth >= 0, ERROR_NOT_ENOUGH_VALUE);
        ethValue = newEthValue;

        // send extra ETH back to sender
        if (extraEth > 0) {
            msg.sender.transfer(extraEth);
        }

        // transfer tokens
        require(token.safeTransfer(msg.sender, _tokenAmount), ERROR_TOKEN_TRANSFER_FAILED);
    }

    function withdraw() external {
        // TODO
    }

    /*
    function getCurrentRatio() internal returns (uint256) {
        uint256 ethValue = address(this).balance;
        uint256 tokenValue = token.balanceOf(address(this));

        return ethValue.mul(tokenValue);
    }
    */
}
