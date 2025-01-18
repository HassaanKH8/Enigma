import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as bip39 from 'bip39';
import EncryptedStorage from 'react-native-encrypted-storage';
import { HDKey } from 'micro-ed25519-hdkey';

export const createWallet = async () => {
  const mnemonic = bip39.generateMnemonic();
  const seed = await bip39.mnemonicToSeed(mnemonic);

  const hd = HDKey.fromMasterSeed(seed.toString('hex'));
  const path = `m/44'/501'/0'/0'`;
  const derived = hd.derive(path);

  if (!derived.privateKey) {
    throw new Error('Failed to derive private key');
  }

  const keypair = Keypair.fromSeed(derived.privateKey);

  return {
    mnemonic,
    publicKey: keypair.publicKey.toBase58(),
    privateKey: Array.from(keypair.secretKey),
  };
};

export const importWalletFromSeed = (mnemonic) => {

  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed phrase');
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);

  const hd = HDKey.fromMasterSeed(seed.toString('hex'));
  const path = `m/44'/501'/0'/0'`;
  const derived = hd.derive(path);

  if (!derived.privateKey) {
    throw new Error('Failed to derive private key');
  }

  const keypair = Keypair.fromSeed(derived.privateKey);

  return {
    mnemonic,
    publicKey: keypair.publicKey.toBase58(),
    privateKey: Array.from(keypair.secretKey),
  };
};
export const loadWallet = async () => {
  try {
    const walletData = await EncryptedStorage.getItem('wallets');
    if (walletData) {
      return JSON.parse(walletData);
    }
    return null;
  } catch (error) {
    console.error('Error loading wallet:', error);
    return null;
  }
};

export const storeWallets = async (walletDatas) => {
  try {
    await EncryptedStorage.setItem('wallets', JSON.stringify(walletDatas));
  } catch (error) {
    console.error('Error storing wallet:', error);
  }
};

export const getWalletBalance = async (publicKey, connection) => {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / 1e9;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return 0;
  }
};

export const sendTransaction = async (senderKeypair, recipientAddress, amount, connection) => {
  try {
    const amountLamports = amount * 1e9;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: new PublicKey(recipientAddress),
        lamports: amountLamports,
      }),
    );

    const signature = await connection.sendTransaction(transaction, [senderKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};