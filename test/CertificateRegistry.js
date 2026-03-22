import { expect } from "chai";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.connect();

describe("CertificateRegistry", function () {
  let CertificateRegistry, registry, owner, issuer, other;

  beforeEach(async function () {
    [owner, issuer, other] = await ethers.getSigners();
    CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    registry = await CertificateRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("owner has ISSUER_ROLE by default", async function () {
    const role = await registry.ISSUER_ROLE();
    expect(await registry.hasRole(role, owner.address)).to.be.true;
  });

  it("only ISSUER_ROLE can upload certificates", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("cert1"));
    await expect(
      registry.connect(owner).storeCertificate(hash, "Alice", "BSc")
    ).to.emit(registry, "CertificateStored");

    await expect(
      registry.connect(other).storeCertificate(hash, "Bob", "MSc")
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });

  it("admin can grant and revoke ISSUER_ROLE", async function () {
    const role = await registry.ISSUER_ROLE();
    await registry.grantRole(role, issuer.address);
    expect(await registry.hasRole(role, issuer.address)).to.be.true;

    await registry.revokeRole(role, issuer.address);
    expect(await registry.hasRole(role, issuer.address)).to.be.false;
  });

  it("prevents duplicate certificate uploads", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("cert2"));
    await registry.storeCertificate(hash, "Alice", "BSc");
    await expect(
      registry.storeCertificate(hash, "Alice", "BSc")
    ).to.be.revertedWith("Certificate already stored");
  });

  it("anyone can verify a certificate", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("cert3"));
    await registry.storeCertificate(hash, "Alice", "BSc");
    expect(await registry.connect(other).verifyHash(hash)).to.be.true;
    expect(await registry.connect(other).verifyHash(ethers.ZeroHash)).to.be.false;
  });

  it("certificate metadata is stored and retrievable", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("cert4"));
    await registry.storeCertificate(hash, "Alice", "BSc");
    const cert = await registry.certificates(hash);
    expect(cert.hash).to.equal(hash);
    expect(cert.studentName).to.equal("Alice");
    expect(cert.degree).to.equal("BSc");
  });

  it("certificateHashes array is updated", async function () {
    const hash1 = ethers.keccak256(ethers.toUtf8Bytes("cert5"));
    const hash2 = ethers.keccak256(ethers.toUtf8Bytes("cert6"));
    await registry.storeCertificate(hash1, "Alice", "BSc");
    await registry.storeCertificate(hash2, "Bob", "MSc");
    expect(await registry.certificateHashes(0)).to.equal(hash1);
    expect(await registry.certificateHashes(1)).to.equal(hash2);
    const count = await registry.getCertificateHashesLength();
    expect(count).to.equal(2);
  });
});