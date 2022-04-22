const { runKeeper } = require('./utils/utils');
const { connectWallet, getVault } = require('./utils/setup');

const keeperAccount = connectWallet()
const vault = getVault()

const AMOUNT_TO_REDEEM = parseInt(process.env.AMOUNT_TO_REDEEM) || 10

// WARNING: Redemption has a 2% fee. This means that the price of
// xUSD should be trading at <2% of the price of USD (or the ALGO
// equivalent) for redemption to be in the profit, after accounting
// for the transaction fees.
// Source: LightPaper - https://docs.xbacked.io/
async function redeem(keeperAccount, vault, amountToRedeem) {

  console.log(`Attempt to redeem ${amountToRedeem} xUSD from the vault`);

  try {
    const success = await keeperAccount.redeemVault({
      amountToRedeem: amountToRedeem,
      vault: vault
    });
    if (success) {
      console.log('Redemption was successful');
    } else {
      console.log('Redemption FAILED');
    }
  } catch (err) {
    console.error(`ERROR; while redeeming ${amountToRedeem} xUSD`);
    console.error(err);
  }
}

async function redemptionKeeper(keeperAccount, vault) {
  await redeem(keeperAccount, vault, AMOUNT_TO_REDEEM)
}
async function runRedemptionKeeper(keeperAccount, vault) {
  await runKeeper(redemptionKeeper, keeperAccount, vault);
}

runRedemptionKeeper(keeperAccount, vault)
  .then(() => { console.log('Keeper Finished Running') })
  .catch(err => {
    console.log(`Keeper encountered error: ${err}`)
    process.exit(1);
  })
