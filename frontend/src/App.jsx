import { useState } from 'react'
import { ethers } from "ethers";
import certificateArtifact from '../../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json';
import './App.css'

function Spinner() {
  return (
    <div className="spinner" style={{margin: '16px 0'}}>
      <div style={{
        width: 32,
        height: 32,
        border: '4px solid #ccc',
        borderTop: '4px solid #333',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: 'auto'
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null)
  const [txStatus, setTxStatus] = useState("")
  const contractAddress = "0x2762189714C80811D79fd2cD4af0A76e417c586f"
 
  async function hashFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  async function onFileChange(e) {
    if (!e.target.files?.[0]) return;

    if (e.target.files[0].size > 5000000) {
      alert("File size exceeds 5MB");
      return;
    }
    setVerifyResult(null);
    setTxStatus("");
    setSelectedFile(e.target.files[0])
    const hash= await hashFile(e.target.files[0])
    console.log('Hash:', hash);
  }

  async function getContract(withSigner=false) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (withSigner) {
      const signer = await provider.getSigner()
      return new ethers.Contract(contractAddress, certificateArtifact.abi, signer);
    }
    return new ethers.Contract(contractAddress, certificateArtifact.abi, provider);
    
  }

  async function onFileUpload() {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }
    if (!window.ethereum) {
      alert("MetaMask is not detected.");
      return;
    }
    try {
      setTxStatus("Requesting wallet...");
      console.log("Uploading:", selectedFile);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      
      const contract = await getContract(true)

      const hash = `0x${await hashFile(selectedFile)}`;
      setFileHash(hash)
      setTxStatus("Sending transaction...");
      const transaction = await contract.storeHash(hash)
      console.log("Transaction sent: ", transaction.hash);
      setTxStatus("Waiting for confirmation...");
      const receipt = await transaction.wait()
      console.log("Transaction confirmed:", {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
      });

      const isStored = await contract.verifyHash(hash)
      setVerifyResult(isStored)
      setTxStatus(isStored ? "Hash stored and verified." : "Stored tx mined, but verify failed.");
    } catch(error) {
      setTxStatus("Upload failed.");
      console.error('Error:', error);

      const raw =
      error?.shortMessage ||
      error?.reason ||
      error?.info?.error?.message ||
      error?.message ||
      "";

      let userMessage = "Transaction failed. Please try again.";

      if (raw.includes("Certificate already stored")) {
        userMessage = "This certificate hash is already registered.";
      } else if (raw.includes("user rejected") || raw.includes("User denied")) {
        userMessage = "Transaction was cancelled in MetaMask.";
      } else if (raw.includes("insufficient funds")) {
        userMessage = "Insufficient ETH for gas fee.";
      } else if (raw.includes("network")) {
        userMessage = "Wrong network. Please switch MetaMask to Sepolia.";
      }

      alert(userMessage);
    } 
  }

  async function onVerify() {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }
    try {
      setTxStatus("Checking verification...");
      const contract = await getContract(false)
      const hash = `0x${await hashFile(selectedFile)}`;
      const isStored = await contract.verifyHash(hash)
      setVerifyResult(isStored);
      setTxStatus("Verification checked.");

    } catch(error) {
      setTxStatus("Upload failed.");
      console.error('Error:', error);

      const raw =
      error?.shortMessage ||
      error?.reason ||
      error?.info?.error?.message ||
      error?.message ||
      "";

      let userMessage = "Transaction failed. Please try again.";

      if (raw.includes("Certificate already stored")) {
        userMessage = "This certificate hash is already registered.";
      } else if (raw.includes("user rejected") || raw.includes("User denied")) {
        userMessage = "Transaction was cancelled in MetaMask.";
      } else if (raw.includes("insufficient funds")) {
        userMessage = "Insufficient ETH for gas fee.";
      } else if (raw.includes("network")) {
        userMessage = "Wrong network. Please switch MetaMask to Sepolia.";
      }

      alert(userMessage);
    }
    
  }

  return (
    <>
      <div>
        <h1>Blockchain Academic Certificate</h1>
        <h3>File Upload</h3>
        <div>
          <input type="file" onChange={onFileChange} />
          <button onClick={onFileUpload}>Upload!</button>
          <button onClick={onVerify} disabled={!selectedFile}>Verify</button>
        </div>
        {selectedFile && (
        <div>
          <p>Name: {selectedFile.name}</p>
          <p>Type: {selectedFile.type || "Unknown"}</p>
          <p>Size: {selectedFile.size} bytes</p>
        </div>
        )}
        {fileHash && <p>Computed Hash: {fileHash}</p>}
        {txStatus && <p>Status: {txStatus}</p>}
        {txStatus === "Waiting for confirmation..." && <Spinner />}
        {verifyResult !== null && (
          <p>Verification: {verifyResult ? "Valid (stored)" : "Not found"}</p>
        )}

      </div>
    </>
  )
}

export default App
