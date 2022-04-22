// The state keeper useful for making queries to the xBacked DAO protocol
// for inspecting the current state of the vaults.
const xbacked = require('@xbacked-dao/xbacked-sdk')

const { connectWallet, getVault } = require('./utils/setup');
const {
  runKeeper,
  getAlgoPrice,
  displayKeeperAccountData,
  getVaultState,
  getVaultAddresses,
  getVaultData
} = require('./utils/utils');
const { storeState, storeOpenVaultAddresses, storeOpenVaultDataBatch, readOpenVaultAddresses } = require('./utils/db');

const DISPLAY_DATA = (process.env.DISPLAY_DATA === 'true') || false;

const keeperAccount = connectWallet()
const vault = getVault()

function displayData(allOpenVaultData, vaultState, algoPrice) {
  // iterate over the addresses that currently have open vaults and display the vault data
  let openVaultData;

  for (let i = 0; i < allOpenVaultData.length; i++) {

    openVaultData = allOpenVaultData[i];

    console.log('\n--------------------------------------------------------------');
    console.log(`Vault ${i}: Checking vault of address: \x1b[32m${openVaultData.address}\x1b[0m`);

    // request the vault data and display them
    console.log('Vault data')
    console.log(openVaultData);

    // if the vault has any debt -- calculating the collateral ratio for vaults
    // without debt throws and error
    if (openVaultData.vaultDebt > 0) {

      // calculate the current collateral ratio based on the price of ALGO
      let colRatio = xbacked.calcCollateralRatio(openVaultData.collateral, xbacked.convertToMicroUnits(algoPrice), openVaultData.vaultDebt);
      const colRatioToMicro = xbacked.convertToMicroUnits(colRatio);
      console.log(`Storred collateral ratio: ${xbacked.convertFromMicroUnits(openVaultData.collateralRatio)} (${openVaultData.collateralRatio}) - liquidating: ${openVaultData.liquidating}`);


      // if the current collateral ratio is less than the vault allows
      if (colRatioToMicro < vaultState.liquidationCollateralRatio || openVaultData.liquidating) {
        console.log(`\x1b[31mCurrent collateral ratio: ${colRatio} (${colRatioToMicro}) -- LIQUIDATE\x1b[0m`);

        let maxDebtPayout = xbacked.calcMaxDebtPayout(openVaultData.collateral, xbacked.convertToMicroUnits(algoPrice), openVaultData.vaultDebt);
        console.log(`maxDebtPayout: ${maxDebtPayout} (${xbacked.convertFromMicroUnits(maxDebtPayout)} xUSD)`);
        let ratioAfterLiquidation = xbacked.calcCollateralRatioAfterLiquidation(openVaultData.collateral, xbacked.convertToMicroUnits(algoPrice), maxDebtPayout, openVaultData.vaultDebt)
        console.log('ratioAfterLiquidation', ratioAfterLiquidation);

      } else {
        console.log(`Current collateral ratio: ${colRatio} (${colRatioToMicro})`);
      }
    }
  }
}

// state keeper is responsible for reading the current state of the contract
// and the current state of the blockchain and storing this information
// locally for the other keepers to use
async function stateKeeper(keeperAccount, vault) {

  const algoPrice = await getAlgoPrice();

  await displayKeeperAccountData(keeperAccount, vault);
  const vaultState = await getVaultState(keeperAccount, vault);

  const state = {
    algoPrice: algoPrice,
    vaultState: vaultState,
  }

  await storeState(state);

  // read the list of the open vault addresses and store them in the DB
  const openVaultAddresses = await getVaultAddresses(keeperAccount, vault);
  await storeOpenVaultAddresses(openVaultAddresses);
  const test = await readOpenVaultAddresses(openVaultAddresses);

  // read the data for each addres and store them in the DB
  const openVaultData = await getVaultData(keeperAccount, vault, openVaultAddresses);
  await storeOpenVaultDataBatch(openVaultData);

  if (DISPLAY_DATA) {
    displayData(openVaultData, vaultState, algoPrice);
  }
}

async function runStateKeeper(keeperAccount, vault) {
  await runKeeper(stateKeeper, keeperAccount, vault);
}

runStateKeeper(keeperAccount, vault)
  .then(() => { console.log('Keeper Finished Running') })
  .catch(err => {
    console.log(`Keeper encountered error: ${err}`)
    process.exit(1);
  });
