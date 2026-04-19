// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract rohan_supplychain is Ownable {
    enum Role {
        None,
        Manufacturer,
        Distributor,
        Retailer,
        Customer
    }

    enum Status {
        Manufactured,
        InTransit,
        Delivered
    }

    struct Product {
        uint256 id;
        string name;
        string description;
        address currentOwner;
        Status status;
        bool exists;
    }

    struct HistoryEntry {
        address actor;
        address from;
        address to;
        Status status;
        uint256 timestamp;
        string action;
    }

    uint256 private nextProductId = 1;

    mapping(address => Role) public roles;
    mapping(uint256 => Product) private products;
    mapping(uint256 => HistoryEntry[]) private productHistory;

    event RoleAssigned(address indexed user, Role indexed role);
    event ProductRegistered(uint256 indexed productId, address indexed manufacturer, string name);
    event ProductTransferred(
        uint256 indexed productId,
        address indexed from,
        address indexed to,
        Status status
    );

    error UnauthorizedRole(Role requiredRole);
    error ProductNotFound(uint256 productId);
    error InvalidRecipientRole(Role expectedRole, Role actualRole);
    error InvalidTransferStage(Role senderRole, Role recipientRole);

    modifier onlyRole(Role requiredRole) {
        if (roles[msg.sender] != requiredRole) {
            revert UnauthorizedRole(requiredRole);
        }
        _;
    }

    modifier validProduct(uint256 productId) {
        if (!products[productId].exists) {
            revert ProductNotFound(productId);
        }
        _;
    }

    constructor() Ownable(msg.sender) {
        roles[msg.sender] = Role.Manufacturer;
        emit RoleAssigned(msg.sender, Role.Manufacturer);
    }

    function assignRole(address user, Role role) external onlyOwner {
        roles[user] = role;
        emit RoleAssigned(user, role);
    }

    function registerProduct(
        string calldata productName,
        string calldata productDescription
    ) external onlyRole(Role.Manufacturer) returns (uint256) {
        uint256 productId = nextProductId;

        products[productId] = Product({
            id: productId,
            name: productName,
            description: productDescription,
            currentOwner: msg.sender,
            status: Status.Manufactured,
            exists: true
        });

        productHistory[productId].push(
            HistoryEntry({
                actor: msg.sender,
                from: address(0),
                to: msg.sender,
                status: Status.Manufactured,
                timestamp: block.timestamp,
                action: "Product Registered"
            })
        );

        nextProductId++;
        emit ProductRegistered(productId, msg.sender, productName);
        return productId;
    }

    function transferProduct(uint256 productId, address recipient) external validProduct(productId) {
        Product storage product = products[productId];
        require(product.currentOwner == msg.sender, "Only current owner can transfer");

        Role senderRole = roles[msg.sender];
        Role recipientRole = roles[recipient];

        if (senderRole == Role.Manufacturer) {
            if (recipientRole != Role.Distributor) {
                revert InvalidRecipientRole(Role.Distributor, recipientRole);
            }
            product.status = Status.InTransit;
        } else if (senderRole == Role.Distributor) {
            if (recipientRole != Role.Retailer) {
                revert InvalidRecipientRole(Role.Retailer, recipientRole);
            }
            product.status = Status.InTransit;
        } else if (senderRole == Role.Retailer) {
            if (recipientRole != Role.Customer) {
                revert InvalidRecipientRole(Role.Customer, recipientRole);
            }
            product.status = Status.Delivered;
        } else {
            revert InvalidTransferStage(senderRole, recipientRole);
        }

        address previousOwner = product.currentOwner;
        product.currentOwner = recipient;

        productHistory[productId].push(
            HistoryEntry({
                actor: msg.sender,
                from: previousOwner,
                to: recipient,
                status: product.status,
                timestamp: block.timestamp,
                action: "Ownership Transferred"
            })
        );

        emit ProductTransferred(productId, previousOwner, recipient, product.status);
    }

    function getProduct(uint256 productId)
        external
        view
        validProduct(productId)
        returns (uint256, string memory, string memory, address, Status)
    {
        Product memory p = products[productId];
        return (p.id, p.name, p.description, p.currentOwner, p.status);
    }

    function getProductHistory(uint256 productId)
        external
        view
        validProduct(productId)
        returns (HistoryEntry[] memory)
    {
        return productHistory[productId];
    }
}
