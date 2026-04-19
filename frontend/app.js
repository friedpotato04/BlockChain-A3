const contractAbi = [
  "function registerProduct(string productName, string productDescription) returns (uint256)",
  "function transferProduct(uint256 productId, address recipient)",
  "function getProduct(uint256 productId) view returns (uint256,string,string,address,uint8)",
  "function getProductHistory(uint256 productId) view returns ((address actor,address from,address to,uint8 status,uint256 timestamp,string action)[])",
  "function assignRole(address user, uint8 role)",
  "function roles(address) view returns (uint8)"
];

let provider;
let signer;
let contract;

const walletAddressEl = document.getElementById("walletAddress");
const contractStatusEl = document.getElementById("contractStatus");
const productOutputEl = document.getElementById("productOutput");
const notificationEl = document.getElementById("notification");

function showSuccess(message) {
  notificationEl.textContent = "✓ " + message;
  notificationEl.style.display = "block";
  setTimeout(() => {
    notificationEl.style.display = "none";
  }, 3500);
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask is required.");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  const addr = await signer.getAddress();
  walletAddressEl.textContent = `Connected: ${addr}`;
  showSuccess("Wallet connected: " + addr.slice(0, 10) + "...");
}

function loadContract() {
  if (!signer) {
    alert("Connect wallet first.");
    return;
  }

  const address = document.getElementById("contractAddress").value.trim();
  contract = new ethers.Contract(address, contractAbi, signer);
  contractStatusEl.textContent = `Loaded contract: ${address}`;
  showSuccess("Contract loaded successfully!");
}

async function registerProduct() {
  if (!contract) {
    alert("Load contract first.");
    return;
  }

  const name = document.getElementById("productName").value.trim();
  const description = document.getElementById("productDescription").value.trim();

  const tx = await contract.registerProduct(name, description);
  await tx.wait();
  showSuccess(`Product '${name}' registered! Tx: ${tx.hash.slice(0, 10)}...`);
  document.getElementById("productName").value = "";
  document.getElementById("productDescription").value = "";
}

async function transferProduct() {
  if (!contract) {
    alert("Load contract first.");
    return;
  }

  const productId = Number(document.getElementById("transferProductId").value);
  const recipient = document.getElementById("recipient").value.trim();

  const tx = await contract.transferProduct(productId, recipient);
  await tx.wait();
  showSuccess(`Product #${productId} transferred to ${recipient.slice(0, 10)}...`);
  document.getElementById("transferProductId").value = "";
  document.getElementById("recipient").value = "";
}

function statusLabel(status) {
  const s = Number(status);
  if (s === 0) return "Manufactured";
  if (s === 1) return "InTransit";
  if (s === 2) return "Delivered";
  return "Unknown";
}

function showDemoProduct() {
  const demoProduct = {
    id: 1,
    name: "ABC",
    description: "PRODUCT",
    currentOwner: "0x1234567890123456789012345678901234567890",
    status: "Delivered",
    history: [
      {
        actor: "0x1111111111111111111111111111111111111111",
        from: "0x0000000000000000000000000000000000000000",
        to: "0x2222222222222222222222222222222222222222",
        status: "Manufactured",
        action: "Product registered by Manufacturer",
        timestamp: "4/19/2026, 10:00:00 AM"
      },
      {
        actor: "0x2222222222222222222222222222222222222222",
        from: "0x2222222222222222222222222222222222222222",
        to: "0x3333333333333333333333333333333333333333",
        status: "InTransit",
        action: "Product transferred to Distributor",
        timestamp: "4/19/2026, 10:15:00 AM"
      },
      {
        actor: "0x3333333333333333333333333333333333333333",
        from: "0x3333333333333333333333333333333333333333",
        to: "0x4444444444444444444444444444444444444444",
        status: "InTransit",
        action: "Product transferred to Retailer",
        timestamp: "4/19/2026, 10:30:00 AM"
      },
      {
        actor: "0x4444444444444444444444444444444444444444",
        from: "0x4444444444444444444444444444444444444444",
        to: "0x5555555555555555555555555555555555555555",
        status: "Delivered",
        action: "Product transferred to Customer",
        timestamp: "4/19/2026, 10:45:00 AM"
      }
    ]
  };
  
  productOutputEl.textContent = JSON.stringify(demoProduct, null, 2);
  showSuccess("Demo Product #1 (ABC) loaded with 4 history entries!");
}

async function viewProduct() {
  if (!contract) {
    alert("Load contract first.");
    return;
  }

  const productId = Number(document.getElementById("viewProductId").value);
  const product = await contract.getProduct(productId);
  const history = await contract.getProductHistory(productId);

  const historyData = history.map((entry) => ({
    actor: entry.actor,
    from: entry.from,
    to: entry.to,
    status: statusLabel(entry.status),
    action: entry.action,
    timestamp: new Date(Number(entry.timestamp) * 1000).toLocaleString()
  }));

  const payload = {
    id: Number(product[0]),
    name: product[1],
    description: product[2],
    currentOwner: product[3],
    status: statusLabel(product[4]),
    history: historyData
  };

  productOutputEl.textContent = JSON.stringify(payload, null, 2);
  showSuccess(`Product #${productId} loaded with ${history.length} history entries!`);
}

document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("loadContract").addEventListener("click", loadContract);
document.getElementById("registerProduct").addEventListener("click", registerProduct);
document.getElementById("transferProduct").addEventListener("click", transferProduct);
document.getElementById("viewProduct").addEventListener("click", viewProduct);
document.getElementById("demoProduct").addEventListener("click", showDemoProduct);
