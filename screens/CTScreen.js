import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { loadWallet } from '../components/walletUtils';
import { API_URLS } from '@raydium-io/raydium-sdk-v2';
import axios from 'axios';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

// const leaderAddress = "6eDPccEWC1BbJXBdEHA3pc2NjThZwAf5n3wb9rxkmuaf"; // Leader's wallet address
const leaderAddress = "LPimZRypmbf26MUquQomJm957Ttn4YUTBUwVBq1fEWe"; // Leader's wallet address
const WEBSOCKET_HTTPS_URL = "https://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"
const WEBSOCKET_WSS_URL = "wss://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"

const CTScreen = () => {
  const solanaConnection = new Connection(WEBSOCKET_HTTPS_URL, {
    wsEndpoint: WEBSOCKET_WSS_URL,
  });
  const connection = new Connection("https://api.mainnet-beta.solana.com/")
  const [trades, setTrades] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [logsListenerId, setLogsListenerId] = useState(null);
  const [wallet, setWallet] = useState(null);

  const leaderPublicKey = new PublicKey(leaderAddress);

  useEffect(() => {
    const initializeWallet = async () => {
      try {
        const walletData = await loadWallet();
        if (walletData?.privateKey && walletData?.publicKey) {
          setWallet(walletData);
        } else {
          setError('Wallet is not initialized correctly');
        }
      } catch (err) {
        console.error('Error loading wallet:', err);
        setError('Error loading wallet');
      }
    };

    initializeWallet();
  }, []);

  const startMonitoring = () => {
    console.log('monitoring started');

    if (logsListenerId) {
      solanaConnection.removeOnLogsListener(logsListenerId);
    }

    const listenerId = solanaConnection.onLogs(
      leaderPublicKey,
      async (logs, context) => {
        console.log('got one');
        const signature = logs.signature;
        const transaction = await solanaConnection.getTransaction(signature, { commitment: 'confirmed' });
        const uniqueMints = [...new Set(transaction.meta.postTokenBalances.map(item => item.mint))];

        if (transaction && transaction.meta && transaction.meta.err === null && uniqueMints) {
          console.log(uniqueMints);
          const details = await getTransactionDetails(signature);
          if (details) {
            setTrades((prevTrades) => {
              const exists = prevTrades.some((trade) => trade.signature === signature);
              if (!exists) {
                return [details, ...prevTrades];
              }
              return prevTrades;
            });
          }
        }
      },
      "confirmed"
    );

    setLogsListenerId(listenerId);
  };

  const stopMonitoring = async () => {
    solanaConnection.removeOnLogsListener(0)
  };

  useEffect(() => {
    const getit = async () => {
      const signature = "m1sTbSUm33QjDmmWvFEHovvMGrDo6AnxWViDncGYkECBtQbLq14T6PoXgSX9zrvzoikSv8DL85ZeqZxiwp4dzX3"
      const transaction = await solanaConnection.getTransaction(signature, { commitment: 'confirmed' });
      const uniqueMints = [...new Set(transaction.meta.postTokenBalances.map(item => item.mint))];
      console.log(uniqueMints);

      if (transaction && transaction.meta && transaction.meta.err === null) {
        const details = await getTransactionDetails(signature);
        if (details) {
          setTrades((prevTrades) => {
            const exists = prevTrades.some((trade) => trade.signature === signature);
            if (!exists) {
              return [details, ...prevTrades];
            }
            return prevTrades;
          });
        }
      }
    }
    getit()
  }, [])

  const getTransactionDetails = async (signature) => {
    try {
      const transaction = await solanaConnection.getTransaction(signature, { commitment: 'confirmed' });

      if (!transaction || !transaction.meta) {
        console.log('Transaction not found or incomplete');
        return null;
      }

      const mint = transaction.meta.postTokenBalances
        .filter(item => item.mint !== "So11111111111111111111111111111111111111112") // Filter condition
        .map(item => item.mint);
      const mintAddress = mint[0]
      const tokenAmount = transaction.meta.postTokenBalances[1]?.uiTokenAmount?.amount || "0";

      const preSOL = transaction.meta.preBalances[0] / 10 ** 9; // SOL before transaction
      const postSOL = transaction.meta.postBalances[0] / 10 ** 9; // SOL after transaction
      const transactionFee = transaction.meta.fee / 10 ** 9; // SOL transaction fee

      const solSpent = Math.abs(preSOL - postSOL - transactionFee); // SOL spent in the transaction
      const transactionType = preSOL > postSOL ? "Buy" : "Sell"; // Determine transaction type
      console.log(signature);

      // console.log(mintAddress[0]);
      // console.log(tokenAmount);
      // console.log(solSpent);
      // console.log(transactionType);


      return {
        signature,
        timestamp: new Date().toISOString(),
        mintAddress,
        tokenAmount,
        solSpent: solSpent.toFixed(9),
        transactionType,
      };
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      return null;
    }
  };

  // useEffect(() => {
  //   if (isListening) {
  //     startMonitoring();
  //   } else {
  //     stopMonitoring();
  //   }

  //   return () => {
  //     stopMonitoring(); // Clean up on component unmount
  //   };
  // }, [isListening]);

  const dosometrade = async (mintAddress, type) => {
    try {
        const response = await fetch(
          type === "Buy" ? (
            `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${mintAddress}&amount=50000000&slippageBps=50&platformFeeBps=0` // Updated platformFeeBps
          ):(
            `https://quote-api.jup.ag/v6/quote?inputMint=${mintAddress}&outputMint=So11111111111111111111111111111111111111112&amount=22650013643&slippageBps=50&platformFeeBps=0` // Updated platformFeeBps
          )
        );
      const data = await response.json();
      dotrade(data)
      if (data.error) throw new Error(data.error);
      console.log(data);
    } catch (err) {
      console.error('Error fetching swap quote:', err);
      setError('Failed to fetch swap quote');
    } finally {
      setLoading(false);
    }
  };

  const dotrade = async(quoteData) => {
    try {
          // Fetch swap transaction from Jupiter API
          const prioritizationFeeLamports = 30000;  // Optional prioritization fee (0.00001 SOL)
    
          const response = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quoteResponse: quoteData,
              userPublicKey: wallet.publicKey.toString(),
              wrapAndUnwrapSol: true,
              feeAccount: "2BY6zQsBkXaZy36NYfxzvyErfHTXu85PXoEqeJYmBa9k",
              prioritizationFeeLamports,
            }),
          });
    
          const swapData = await response.json();
          if (!swapData.swapTransaction) throw new Error('Failed to fetch swap transaction');
    
          const transactionBuffer = Buffer.from(swapData.swapTransaction, 'base64');
          const transaction = VersionedTransaction.deserialize(transactionBuffer);
    
          // Fetch latest blockhash before signing
          const latestBlockhash = await connection.getLatestBlockhash();
          transaction.message.recentBlockhash = latestBlockhash.blockhash;
          transaction.message.feePayer = wallet.publicKey;
    
          // Sign the transaction
          const senderKeypair = Keypair.fromSecretKey(Uint8Array.from(wallet.privateKey));
          transaction.sign([senderKeypair]);
    
          // Serialize and send the transaction
          const serializedTransaction = transaction.serialize();
          const txid = await connection.sendRawTransaction(serializedTransaction, {
            skipPreflight: false, // Enable preflight checks
          });
    
          console.log(`Transaction sent with ID: ${txid}`);
    
          // Confirm the transaction
          const confirmation = await connection.confirmTransaction(
            {
              signature: txid,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            'confirmed' // Commitment level
          );
    
          if (confirmation.value.err) {
            throw new Error('Transaction confirmation failed with errors');
          }
    
          console.log(`Transaction confirmed: https://solscan.io/tx/${txid}`);
          setTxId(txid);
    
        } catch (err) {
          if (err.message.includes('block height exceeded') || err.message.includes('Blockhash expired')) {
            console.error('Error: Blockhash expired. Fetch a new quote and retry.');
            setError('Blockhash expired. Fetch a new quote and retry.');
          } else {
            console.error('Error performing swap:', err);
            setError(err.message || 'An error occurred during the swap');
          }
        } finally {
          setIsSwapping(false);
        }
  }

  return (
    <View style={styles.container}>
      <Button
        title={"Start Monitoring"}
        onPress={() => { setIsListening(true); startMonitoring() }}
      />
      <Button
        title={"Stop Monitoring"}
        onPress={() => { setIsListening(false); stopMonitoring() }}
      />
      <FlatList
        data={trades}
        renderItem={({ item }) => (
          <View style={styles.tradeContainer}>
            <Text style={styles.signature}>Signature: {item.signature}</Text>
            <Text style={styles.timestamp}>Timestamp: {item.timestamp}</Text>
            <Text>Mint Address: {item.mintAddress}</Text>
            <Text>Token Amount: {item.tokenAmount}</Text>
            <Text>SOL Spent: {item.solSpent}</Text>
            <Text>Transaction Type: {item.transactionType}</Text>
            <Text onPress={() => { dosometrade(item.mintAddress, item.transactionType) }}>Copy Trade</Text>
          </View>
        )}
        keyExtractor={(item) => item.signature}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  tradeContainer: {
    backgroundColor: "white",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  signature: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  timestamp: {
    fontStyle: "italic",
    marginBottom: 5,
  },
});

export default CTScreen;