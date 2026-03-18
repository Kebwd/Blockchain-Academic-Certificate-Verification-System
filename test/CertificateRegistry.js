import {expect} from "chai";
// import {ethers} from "hardhat";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.connect();

describe("CertificateRegistry", function () {
  let registry, owner, addr1;
  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CertificateRegistry");
    registry = await Registry.deploy();
  });

  it("should store and verify a hash", async function() {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(registry.storeHash(hash))
        .to.emit(registry, "CertificateStored")
        .withArgs(hash, owner.address)
    expect(await registry.verifyHash(hash)).to.equal(true)
  });

  it("should not allow storing the same hash twice", async function () {
     const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
     await registry.storeHash(hash)
     await expect(registry.storeHash(hash)).to.be.revertedWith("Certificate already stored")
  });

  it("should return false for unknown hash", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("notstored"));
    expect(await registry.verifyHash(hash)).to.equal(false);
  });

  it("should allow different users to store different hashes", async function () {
    const hash1 = ethers.keccak256(ethers.toUtf8Bytes("a"));
    const hash2 = ethers.keccak256(ethers.toUtf8Bytes("b"));
    await registry.connect(owner).storeHash(hash1);
    await registry.connect(addr1).storeHash(hash2);
    expect(await registry.verifyHash(hash1)).to.equal(true);
    expect(await registry.verifyHash(hash2)).to.equal(true);
  });

});