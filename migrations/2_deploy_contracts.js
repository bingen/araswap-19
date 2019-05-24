/* global artifacts */
var Araswap = artifacts.require('Araswap.sol')

module.exports = function(deployer) {
  deployer.deploy(Araswap)
}
