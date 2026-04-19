const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("rohan_supplychain", function () {
  async function deployFixture() {
    const [owner, manufacturer, distributor, retailer, customer, outsider] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory("rohan_supplychain");
    const contract = await Contract.connect(owner).deploy();
    await contract.waitForDeployment();

    await contract.connect(owner).assignRole(manufacturer.address, 1);
    await contract.connect(owner).assignRole(distributor.address, 2);
    await contract.connect(owner).assignRole(retailer.address, 3);
    await contract.connect(owner).assignRole(customer.address, 4);

    return { contract, owner, manufacturer, distributor, retailer, customer, outsider };
  }

  it("allows only manufacturer role to register product", async function () {
    const { contract, manufacturer, outsider } = await deployFixture();

    await expect(contract.connect(outsider).registerProduct("Phone", "Blue model"))
      .to.be.revertedWithCustomError(contract, "UnauthorizedRole");

    await expect(contract.connect(manufacturer).registerProduct("Phone", "Blue model"))
      .to.emit(contract, "ProductRegistered")
      .withArgs(1, manufacturer.address, "Phone");
  });

  it("tracks product transfer across supply chain stages", async function () {
    const { contract, manufacturer, distributor, retailer, customer } = await deployFixture();

    await contract.connect(manufacturer).registerProduct("TV", "OLED 55 inch");

    await contract.connect(manufacturer).transferProduct(1, distributor.address);
    await contract.connect(distributor).transferProduct(1, retailer.address);
    await contract.connect(retailer).transferProduct(1, customer.address);

    const product = await contract.getProduct(1);
    expect(product[3]).to.equal(customer.address);
    expect(product[4]).to.equal(2);

    const history = await contract.getProductHistory(1);
    expect(history.length).to.equal(4);
    expect(history[0].action).to.equal("Product Registered");
    expect(history[3].action).to.equal("Ownership Transferred");
  });

  it("prevents invalid role transitions", async function () {
    const { contract, manufacturer, retailer } = await deployFixture();

    await contract.connect(manufacturer).registerProduct("Fridge", "Double door");

    await expect(contract.connect(manufacturer).transferProduct(1, retailer.address))
      .to.be.revertedWithCustomError(contract, "InvalidRecipientRole");
  });
});
