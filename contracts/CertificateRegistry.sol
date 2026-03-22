// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Certificate {
        bytes32 hash;
        uint256 timestamp;
        string studentName; 
        string degree; 
    }

    bytes32[] public certificateHashes;
    mapping(bytes32 => Certificate) public certificates;

    event CertificateStored(bytes32 indexed hash, address indexed submitter);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    // Store certificate on the blockchain
    function storeCertificate(bytes32 _hash, string memory name, string memory _degree) public onlyRole(ISSUER_ROLE) {
        require(certificates[_hash].hash == 0, "Certificate already stored");
        Certificate memory certificate = Certificate({
            hash: _hash,
            timestamp: block.timestamp,
            studentName: name,
            degree: _degree
        });

        certificates[_hash] = certificate;
        certificateHashes.push(_hash);
        emit CertificateStored(_hash, msg.sender);
    }

    // Verify if a given certificate exists
    function verifyHash(bytes32 _hash) public view returns (bool) {
        return certificates[_hash].hash != 0;
    }

    function getCertificateHashesLength() public view returns (uint256) {
        return certificateHashes.length;
    }
}