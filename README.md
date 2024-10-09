# hyperweb

<p align="center" width="100%">
    <img height="90" src="https://github.com/user-attachments/assets/f672f9b8-e59a-4f44-8f51-df3e8d2eaae5" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/hyperweb-io/hyperweb-boilerplate/actions/workflows/e2e-tests.yaml">
    <img height="20" src="https://github.com/hyperweb-io/hyperweb-boilerplate/actions/workflows/e2e-tests.yaml/badge.svg" />
  </a>
  <br />
   <a href="https://github.com/hyperweb-io/hyperweb-boilerplate/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
   <a href="https://github.com/cosmology-tech/starshipjs"><img height="20" src="https://img.shields.io/badge/CI-Starship-blue"></a>
</p>

# Hyperweb Boilerplate

Welcome to **Hyperweb**, the blockchain for JavaScript smart contracts. Hyperweb enables developers to write decentralized applications (dApps) using TypeScript, designed for cross-chain compatibility and ease of development.

## Table of Contents

- [Quickstart](#quickstart)
    - [Contract Layout](#contract-layout)
    - [Building and Bundling](#building-and-bundling)
    - [Creating JSD Client](#creating-jsd-client)
    - [Deploying and Interacting with the Contract](#deploying-and-interacting-with-the-contract)
- [Usage](#usage)
    - [Instantiating a Contract](#instantiating-a-contract)
    - [Interacting with the Contract](#interacting-with-the-contract)
    - [Evaluating Functions on the Contract](#evaluating-functions-on-the-contract)
    - [Reading Contract State](#reading-contract-state)
- [Development](#development)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/hyperweb-io/hyperweb-boilerplate.git

yarn
```

## Quickstart

### Bundle Contracts

1. Clean previous builds:
```bash
yarn clean
```
2. Build contracts:
```bash
yarn build
```

This bundles the contracts from src/** into dist/contracts/.

### Spin Up Starship
#### Enable Kubernetes in Docker Desktop
Docker Desktop includes a standalone Kubernetes server and client, as well as Docker CLI integration that runs on your machine.
To enable Kubernetes in Docker Desktop:

1. From the Docker Dashboard, select the Settings.
2. Select Kubernetes from the left sidebar.
3. Next to Enable Kubernetes, select the checkbox.
4. Select Apply & Restart to save the settings and then click Install to confirm.

#### Install `kubectl` and `helm`. 
```bash
yarn starship install  ## and follow steps to install kubectl and helm
```

#### Start Starship
```bash
yarn starship start
```
Spins up a local blockchain using configs/local.yaml.
Wait for Starship to initialize.

For more details, refer to the [Starship Docs](https://docs.cosmology.zone/starship/).

#### Interact with Chain
Once the starship nodes are running, then you can interact with the chain using following endpoints:
- REST: http://localhost:1317
- RPC: http://localhost:26657
- Faucet: http://localhost:8000

### Run Tests
Run tests:
```bash
yarn test
```
The test suite deploys the contracts, interacts with them, and validates state transitions. The tests are located in tests/.

---

## Usage

### Creating JSD Client

Once the contract is bundled, you need to create a client using `hyperwebjs` to interact with the Hyperweb chain.

Example setup to create a `hyperwebjs` client:

```ts
import { getSigningJsdClient, jsd } from 'hyperwebjs';

async function setupClient() {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic("your-mnemonic");
  const rpcEndpoint = "your-rpc-endpoint";

  const signingClient = await getSigningJsdClient({
    rpcEndpoint,
    signer: wallet
  });

  return signingClient;
}
```

### Deploying and Interacting with the Contract

To deploy and instantiate the contract on the Hyperweb blockchain, read the bundled contract file and use the `hyperwebjs` client to broadcast it to the chain.

Example deployment process:

```ts
import fs from 'fs';
import path from 'path';

async function deployContract(signingClient, address) {
  const contractCode = fs.readFileSync(path.join(__dirname, '../dist/contracts/bundle1.js'), 'utf8');

  const msg = jsd.jsd.MessageComposer.fromPartial.instantiate({
    creator: address,
    code: contractCode,
  });

  const fee = { amount: [{ denom: 'token', amount: '100000' }], gas: '550000' };

  const result = await signingClient.signAndBroadcast(address, [msg], fee);
  console.log('Contract deployed:', result);
}
```

### Instantiating a Contract

To instantiate the contract, use the `instantiate` method of the `hyperwebjs` client. The contract index will be returned, which is used to interact with the contract.

```ts
const contractCode = fs.readFileSync('dist/contracts/bundle1.js', 'utf8');
const result = await signingClient.signAndBroadcast(address, [
  jsd.jsd.MessageComposer.fromPartial.instantiate({
    creator: address,
    code: contractCode,
  })
], fee);

const contractIndex = jsd.jsd.MsgInstantiateResponse.fromProtoMsg(result.msgResponses[0]).index;
console.log('Contract instantiated with index:', contractIndex);
```

### Interacting with the Contract

Once the contract is instantiated, you can invoke functions like `inc`, `dec`, or `read` to interact with it.

Example to increment a value:

```ts
const msg = jsd.jsd.MessageComposer.fromPartial.eval({
  creator: address,
  index: contractIndex,
  fnName: "inc",
  arg: JSON.stringify({ x: 10 }),
});

const result = await signingClient.signAndBroadcast(address, [msg], fee);
console.log('Increment result:', result);
```

### Evaluating Functions on the Contract

To evaluate functions like `inc`, `dec`, or any other function within the contract, you can use the `eval` message type.

Example to decrement a value:

```ts
const msg = jsd.jsd.MessageComposer.fromPartial.eval({
  creator: address,
  index: contractIndex,
  fnName: "dec",
  arg: JSON.stringify({ x: 5 }),
});

const result = await signingClient.signAndBroadcast(address, [msg], fee);
console.log('Decrement result:', result);
```

### Reading Contract State

You can query the state of the contract by using the `read` function.

Example to read the contract state:

```ts
const state = await queryClient.jsd.jsd.localState({ index: contractIndex, key: 'value' });
console.log('Contract state:', state);
```

---

## Development

For local development, you can run the tests provided in the `tests/` folder to validate contract functionality using `starshipjs` to simulate chain interactions.
