const hre = require("hardhat");

async function main() {
  const SupplyChain = await hre.ethers.getContractFactory("rohan_supplychain");
  const supplyChain = await SupplyChain.deploy();
  await supplyChain.waitForDeployment();

  const address = await supplyChain.getAddress();
  const deploymentTx = supplyChain.deploymentTransaction();

  console.log("rohan_supplychain deployed to:", address);
  console.log("Deployment transaction hash:", deploymentTx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
