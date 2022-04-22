const axios = require('axios');
const xbacked = require('@xbacked-dao/xbacked-sdk')

// set the ID of the tokens
const ALGO_TOKEN_ID = process.env.ALGO_TOKEN_ID || 0;
const xUSD_TOKEN_ID = process.env.xUSD_TOKEN_ID || 62281549;

const LOOP = (process.env.LOOP === 'true') || false;
const FREQUENCY = parseInt(process.env.FREQUENCY) || 100;

// Do not set a default ALGO to USD price to use the Coinmarketcap API
// for fetching a current value
let DEFAULT_ALGO_USD_PRICE = process.env.DEFAULT_ALGO_USD_PRICE;

// fetch ALGO price data from Coinmarketcap
async function getAlgoUSDPriceFromCMC() {
  try {

    const response = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY,
      },
      params: {
        symbol: 'ALGO'
      }
    });
    return response.data.data.ALGO[0].quote.USD.price;

  } catch (error) {

    console.error('ERROR; While fetching the ALGO-USD price from the CoinMarketCap API');
    console.error(error);
    return null;

  }
}

// get all of the wallet addresses that have open vaults and:
module.exports.getVaultAddresses = async function (keeperAccount, vault) {
  console.log('\nFetching currently open vaults - this might take a while...');
  const openVaultAddresses = await xbacked.getOpenVaults({
    vault: vault,
    account: keeperAccount,
  });

  console.log(`There are currenlty ${openVaultAddresses.length} open vaults`);
  console.log('Their details are displayed below alongside their liquidation status.');

  return openVaultAddresses;
}

// get the data for all the vaults and return the JSON array
module.exports.getVaultData = async function (keeperAccount, vault, openVaultAddresses) {

  let allOpenVaultData = [];
  for (let i = 0; i < openVaultAddresses.length; i++) {

    openVaultAddress = openVaultAddresses[i]

    console.log(`Getting data for \x1b[32m${openVaultAddress}\x1b[0m`);
    openVaultData = await vault.getUserInfo({ account: keeperAccount, address: openVaultAddress });

    allOpenVaultData.push({
      address: openVaultAddress,
      ...openVaultData
    })
  }

  return allOpenVaultData;
}

// get Algo price in USD
module.exports.getAlgoPrice = async function () {
  // get ALGO price
  let algoPrice = DEFAULT_ALGO_USD_PRICE;
  console.log('\nGet current ALGO price in USD...');
  if (process.env.CMC_API_KEY && !DEFAULT_ALGO_USD_PRICE) {
    algoPrice = await getAlgoUSDPriceFromCMC();
  }
  console.log(`ALGO price: ${algoPrice} USD`);

  return algoPrice;
}

// display keeper account-specific data
module.exports.displayKeeperAccountData = async function (keeperAccount, vault) {
  // get info for keeper-account
  console.log('\nFetching account-related Data...');

  const keeperWalletAddress = await keeperAccount.getAddress();
  console.log('Current keeper account:', keeperWalletAddress);
  const keeperWalletALGOBalance = await keeperAccount.getBalance({ tokenId: ALGO_TOKEN_ID });
  console.log(`Account balance: ${xbacked.convertFromMicroUnits(keeperWalletALGOBalance)} ALGO`);
  const keeperWalletxUSDBalance = await keeperAccount.getBalance({ tokenId: xUSD_TOKEN_ID });
  console.log(`Account balance: ${xbacked.convertFromMicroUnits(keeperWalletxUSDBalance)} xUSD`);
  const keeperVault = await vault.getUserInfo({ account: keeperAccount, address: keeperWalletAddress });
  console.log('Vault related with the keeper wallet:');
  console.log(keeperVault);
}

// display total vault-specific data
module.exports.getVaultState = async function (keeperAccount, vault) {
  // get vault-related info
  console.log('\nFetching vault-related Data...');

  const vaultState = await keeperAccount.getVaultState({ vault });
  console.log('Current vault state:');
  console.log(vaultState);

  return vaultState;
}

// function to compute the health ratio for all of the open vaults supplied by
// the allOpenVaultData argument
// return the accounts in ascending health order and lower health means the
// vault is closer to liquidation
module.exports.computeVaultHealth = function (allOpenVaultData, algoPrice) {

  let openVaultData;
  let vaultHealth = new Map();

  for (let i = 0; i < allOpenVaultData.length; i++) {

    openVaultData = allOpenVaultData[i];

    // console.log(`Vault ${i}: computing health for address \x1b[32m${openVaultData.address}\x1b[0m`);

    // if the vault has any debt -- calculating the collateral ratio for vaults
    // without debt throws and error
    if (openVaultData.vaultDebt > 0) {

      // calculate the current collateral ratio based on the price of ALGO
      let colRatio = xbacked.calcCollateralRatio(openVaultData.collateral, xbacked.convertToMicroUnits(algoPrice), openVaultData.vaultDebt);
      vaultHealth.set(colRatio, openVaultData.address);
    }
  }

  // return a Map after sorting out the entries based on the keys
  // in ascending order: the least healthy vaults are at the beggining
  // of the Map
  return new Map([...vaultHealth].sort((a, b) => a[0] - b[0]));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// wrapper function that runs the keeperFunction provided
module.exports.runKeeper = async function (keeperFunction, keeperAccount, vault) {

  if (LOOP) {
    setInterval(function () { keeperFunction(keeperAccount, vault); }, FREQUENCY * 1000);
    // setInterval(function () { console.log('test') }, FREQUENCY * 1000)
  } else {
    keeperFunction(keeperAccount, vault);
  }
}
