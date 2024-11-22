// @ts-nocheck
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { assertIsDeliverTxSuccess } from '@cosmjs/stargate';
import { getSigningJsdClient, jsd } from 'hyperwebjs';
import { useChain, generateMnemonic } from 'starshipjs';
import path from 'path';
import fs from 'fs';
import { sleep } from '../test-utils/sleep';
import './setup.test';

describe('Contract: Lottery contract test', () => {
  let wallet, wallet2, wallet3, address, address2, address3, queryClient;
  let signingClient1, signingClient2, signingClient3;
  let chainInfo, getRpcEndpoint, creditFromFaucet;
  let contractCode, contractIndex;
  let fee;
  const DEFAULT_DENOM = 'uusdc';
  let denom = DEFAULT_DENOM;
  let winner;

  beforeAll(async () => {
    ({
      chainInfo,
      getRpcEndpoint,
      creditFromFaucet
    } = useChain('hyperweb'));

    // Initialize wallets
    wallet = await DirectSecp256k1HdWallet.fromMnemonic(generateMnemonic(), {
      prefix: chainInfo.chain.bech32_prefix,
    });
    address = (await wallet.getAccounts())[0].address;
    console.log(`contract creator address: ${address}`);

    wallet2 = await DirectSecp256k1HdWallet.fromMnemonic(generateMnemonic(), {
      prefix: chainInfo.chain.bech32_prefix,
    });

    address2 = (await wallet2.getAccounts())[0].address;
    console.log(`secondary wallet address: ${address2}`);

    wallet3 = await DirectSecp256k1HdWallet.fromMnemonic(generateMnemonic(), {
      prefix: chainInfo.chain.bech32_prefix,
    });

    address3 = (await wallet3.getAccounts())[0].address;
    console.log(`third wallet address: ${address3}`);

    // Initialize query client
    queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: await getRpcEndpoint(),
    });

    // Initialize signing clients for both wallets
    signingClient1 = await getSigningJsdClient({
      rpcEndpoint: await getRpcEndpoint(),
      signer: wallet,
    });

    signingClient2 = await getSigningJsdClient({
      rpcEndpoint: await getRpcEndpoint(),
      signer: wallet2,
    });

    signingClient3 = await getSigningJsdClient({
      rpcEndpoint: await getRpcEndpoint(),
      signer: wallet3,
    });

    // Fund both wallets
    await creditFromFaucet(address, denom);
    await creditFromFaucet(address2, denom);
    await creditFromFaucet(address3, denom);

    fee = { amount: [{ denom, amount: '100000' }], gas: '550000' };
    await sleep(5000); // Ensure token transfer is complete
  });

  it('check initial balance', async () => {
    const balance = await signingClient1.getBalance(address, denom);
    console.log(`Initial balance: ${balance.amount}`);
    expect(balance.amount).toEqual('10000000000');
    expect(balance.denom).toEqual(denom);
  });

  it('instantiate contract', async () => {
    const contractPath = path.join(__dirname, '../dist/contracts/bundle3.js');
    contractCode = fs.readFileSync(contractPath, 'utf8');

    const msg = jsd.jsd.MessageComposer.fromPartial.instantiate({
      creator: address,
      code: contractCode,
    });

    const result = await signingClient1.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);

    const response = jsd.jsd.MsgInstantiateResponse.fromProtoMsg(result.msgResponses[0]);
    contractIndex = response.index;
    expect(contractIndex).toBeGreaterThan(0);
    console.log(`Contract instantiated with index: ${contractIndex}`);
  });

  it('enter lottery with wallet2', async () => {
    const entryFee = 1000000;

    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address2,
      index: contractIndex,
      fnName: 'enterLottery',
      arg: `{"entryFee":${entryFee}}`, 
    });

    const result = await signingClient2.signAndBroadcast(address2, [msg], fee);
    assertIsDeliverTxSuccess(result);

    const response = jsd.jsd.MsgEvalResponse.fromProtoMsg(result.msgResponses[0]);
    expect(response.result).toEqual('true');
    console.log('Wallet2 entered the lottery.');
  });

  it('enter lottery with wallet1', async () => {
    const entryFee = 1100000;
  
    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: contractIndex,
      fnName: 'enterLottery',
      arg: `{"entryFee":${entryFee}}`,
    });
  
    const result = await signingClient1.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);
  
    const response = jsd.jsd.MsgEvalResponse.fromProtoMsg(result.msgResponses[0]);
    expect(response.result).toEqual('true');
  });

  it('enter with less funds with wallet3', async () => {
    const entryFee = 900;

    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address3,
      index: contractIndex,
      fnName: 'enterLottery',
      arg: `{"entryFee":${entryFee}}`,
    });
    try {
      await signingClient3.signAndBroadcast(address3, [msg], fee);
    } catch (error) {
      expect(error.message).toEqual('Entry fee is too low.');
    }
  });

  it('check duplicate entry', async () => {
    const entryFee = 1200000;

    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: contractIndex,
      fnName: 'enterLottery',
      arg: `{"entryFee":${entryFee}}`,
    });
  
    try {
      await signingClient1.signAndBroadcast(address, [msg], fee);
    } catch (error) {
      expect(error.message).toEqual('This address has already entered the lottery');
    }
  });
  
  it('draw winner', async () => {
    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: contractIndex,
      fnName: 'drawWinner',
      arg: {},
    });

    const result = await signingClient1.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);

    const response = jsd.jsd.MsgEvalResponse.fromProtoMsg(result.msgResponses[0]);
    winner = response.result.trim().replace(/^"|"$/g, '');

    const participants = [address, address2];
    console.log(`winner: ${winner}`);
    expect(participants).toContain(winner); 
 });

 it('check you cannot draw winner twice', async () => {
  const msg = jsd.jsd.MessageComposer.fromPartial.eval({
    creator: address2,
    index: contractIndex,
    fnName: 'drawWinner',
    arg: {},
  });

  try {
    await signingClient2.signAndBroadcast(address2, [msg], fee);
  } catch (error) {
    expect(error.message).toEqual('A winner has already been drawn.');
  }
 });

 it('enter lottery with wallet3 after winner is drawn', async () => {
  const entryFee = 1300000;

  const msg = jsd.jsd.MessageComposer.fromPartial.eval({
    creator: address3,
    index: contractIndex,
    fnName: 'enterLottery',
    arg: `{"entryFee":${entryFee}}`,
  });

  try {
    await signingClient3.signAndBroadcast(address3, [msg], fee);
  } catch (error) {
    expect(error.message).toEqual('A winner has already been drawn.');
  }
 });
});
