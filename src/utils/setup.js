const xbacked = require('@xbacked-dao/xbacked-sdk')

// setup the constants for the keeper
const VAULT_ID = process.env.VAULT_ID || xbacked.VAULT_IDS.TestNet.algo;

const NETWORK_CONFIG = process.env.XBACKED_NETWORK || 'TestNet';
const ALGO_WALLET_SEED_PHRASE = process.env.ALGO_WALLET_SEED_PHRASE;

// connect to the wallet and display useful info
module.exports.connectWallet = function () {

  console.log('----------------------------------------------------------------');
  console.log(`Running on "${NETWORK_CONFIG}"`);
  console.log('----------------------------------------------------------------\n');


  // instantiate an account if the seed phrase is supplied as an environmnet variable
  if (!ALGO_WALLET_SEED_PHRASE) {
    console.error('ERROR; Please set your wallet mnemonic seed phrase as an environment variable. One way to do this is by running:');
    console.error('\texport ALGO_WALLET_SEED_PHRASE=`your_seed_phrase_here`');
    process.exit(1);
  }

  const keeperAccount = new xbacked.Account({
    network: NETWORK_CONFIG,
    mnemonic: ALGO_WALLET_SEED_PHRASE,
  });

  return keeperAccount;
}

module.exports.getVault = function () {

  console.log('----------------------------------------------------------------');
  console.log(`Get vault with vault ID: ${VAULT_ID}`);
  console.log('----------------------------------------------------------------\n');

  // instantiate a vault and query vault-related data
  const vault = new xbacked.Vault({ id: VAULT_ID });

  return vault;
}
