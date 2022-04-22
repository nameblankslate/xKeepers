const { runKeeper, getVaultState } = require('./utils/utils');
const { connectWallet, getVault } = require('./utils/setup');

const keeperAccount = connectWallet()
const vault = getVault()

// select a value that makes it worthwhile to collect the fees based
// on your goals
const ACCRUED_INTEREST_COLLECTION_THRESHOLD = parseInt(process.env.ACCRUED_INTEREST_COLLECTION_THRESHOLD) || 100000;

// Distributes `accruedInterest` (xUSD supply fees) to the DAO and governance
// stakers. Calling the function doesn't reward the keeper directly.
// Source: LightPaper - https://docs.xbacked.io/
async function settleInterest(keeperAccount, vault) {

  vaultState = await getVaultState(keeperAccount, vault);
  // console.debug(vaultState);

  if (vaultState.accruedInterest > ACCRUED_INTEREST_COLLECTION_THRESHOLD) {
    console.log(`Settling interest for vault is greater than the threshold ${ACCRUED_INTEREST_COLLECTION_THRESHOLD}.`)
    try {
      const success = await keeperAccount.settleInterest({
        vault: vault,
      });
      if (success) {
        console.log(`Settling interest for vault was successful`);
      } else {
        console.log(`Settling interest for vault FAILED`);
      }
    } catch (err) {
      console.error(`ERROR; settling interest for vault`);
      console.error(err);
    }
  } else {
    console.log(`Currend accrued fees ${vaultState.accruedInterest} are below the threshold ${ACCRUED_INTEREST_COLLECTION_THRESHOLD}`);
  }
}

async function settleInterestKeeper(keeperAccount, vault) {
  await settleInterest(keeperAccount, vault);
}

async function runSettleInterestKeeper(keeperAccount, vault) {
  await runKeeper(settleInterestKeeper, keeperAccount, vault);
}

runSettleInterestKeeper(keeperAccount, vault)
  .then(() => { console.log('Keeper Finished Running') })
  .catch(err => {
    console.log(`Keeper encountered error: ${err}`)
    process.exit(1);
  })
