import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    TouchableOpacity,
    Linking,
    Image,
    Modal,
    FlatList,
    StatusBar,
} from 'react-native';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import FastImage from 'react-native-fast-image';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const SwapScreen = ({route}) => {
    const {walletData} = route.params
    const [quoteData, setQuoteData] = useState(null);
    const [error, setError] = useState(null);
    const [txId, setTxId] = useState(null);
    const [isSwapping, setIsSwapping] = useState(false);
    const [wallet, setWallet] = useState(null);
    const [tokenList, setTokenList] = useState([]);
    const [inputMint, setInputMint] = useState('');
    const [outputMint, setOutputMint] = useState('');
    const [inputAmount, setInputAmount] = useState('');
    const [outputAmount, setOutputAmount] = useState('');
    const [inputDecimals, setInputDecimals] = useState(0);
    const [outputDecimals, setOutputDecimals] = useState(0);
    const [isModalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTokenList, setFilteredTokenList] = useState(tokenList);
    const [isSelectingInput, setIsSelectingInput] = useState(true);
    const [swapPressed, setSwapPressed] = useState(false);
    const [errorTokens, setErrorTokens] = useState([]);
    const [tokens, setTokens] = useState([]);

    const WEBSOCKET_HTTPS_URL = "https://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"
    const WEBSOCKET_WSS_URL = "wss://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"

    const connection = new Connection(WEBSOCKET_HTTPS_URL, {
        wsEndpoint: WEBSOCKET_WSS_URL,
    });

    useEffect(() => {
        const initializeWallet = async () => {
            try {
                if (walletData?.privateKey && walletData?.publicKey) {
                    setWallet(walletData);
                    fetchTokenBalances(walletData.publicKey);
                } else {
                    setError('Wallet is not initialized correctly');
                }
            } catch (err) {
                console.error('Error loading wallet:', err);
                setError('Error loading wallet');
            }
        };

        const fetchTokenList = async () => {
            try {
                const response = await fetch('https://tokens.jup.ag/tokens?tags=verified');
                const data = await response.json();
                setTokenList(data);

                if (data.length > 0) {
                    setInputMint(data[0].address);
                    setOutputMint(data[1].address);
                    setInputDecimals(data[0].decimals);
                    setOutputDecimals(data[1].decimals);
                }
            } catch (err) {
                console.error('Error fetching token list:', err);
                setError('Failed to fetch token list');
            }
        };

        initializeWallet();
        fetchTokenList();
    }, []);

    useEffect(() => {
        if (searchQuery === '') {
            setFilteredTokenList(tokenList);
        } else {
            const filtered = tokenList.filter(
                (token) =>
                    token.symbol.toLowerCase().includes(searchQuery) ||
                    token.address.toLowerCase().includes(searchQuery)
            );
            setFilteredTokenList(filtered);
        }
    }, [searchQuery, tokenList]);

    const openLink = () => {
        Linking.openURL(`https://solscan.io/tx/${txId}`);
    };

    const setErrorForToken = (tokenAddress) => {
        setErrorTokens((prev) => [...prev, tokenAddress]);
    };

    const fetchSwapQuote = async () => {
        if (!inputMint || !outputMint || !inputAmount) {
            setQuoteData(null);
            setOutputAmount('');
            return;
        }

        if (isNaN(inputAmount) || parseFloat(inputAmount) <= 0) {
            setError('Please enter a valid input amount in SOL');
            return;
        }

        setError(null);

        try {
            const lamports = Math.floor(parseFloat(inputAmount) * `1e${inputDecimals}`);

            const response = await fetch(
                `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${lamports}&slippageBps=50&platformFeeBps=85`
            );
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setQuoteData(data);
            setOutputAmount((data?.outAmount || 0) / `1e${outputDecimals}`);
        } catch (err) {
            console.error('Error fetching swap quote:', err);
            setError('Failed to fetch swap quote');
        }
    };

    const performSwap = async () => {
        if (!wallet) {
            setError('Wallet is not initialized');
            return;
        }

        if (!quoteData) {
            setError('No quote data available to perform the swap');
            return;
        }
        const balance = await tokens.find((t) => t.mint === inputMint)?.balance || 0
        if (inputAmount > balance || inputAmount === 0){
            setError("Please enter a valid amount.")
            return;
        }

        setError(null)
        setIsSwapping(true);
        setTimeout(() => {
            setSwapPressed(true)
        }, 1000)

        try {
            const prioritizationFeeLamports = 400000;

            const response = await fetch('https://quote-api.jup.ag/v6/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quoteResponse: quoteData,
                    userPublicKey: wallet.publicKey.toString(),
                    wrapAndUnwrapSol: true,
                    feeAccount: '2BY6zQsBkXaZy36NYfxzvyErfHTXu85PXoEqeJYmBa9k',
                    prioritizationFeeLamports,
                }),
            });

            const swapData = await response.json();
            if (!swapData.swapTransaction) throw new Error('Failed to fetch swap transaction');

            const transactionBuffer = Buffer.from(swapData.swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(transactionBuffer);

            const getLatestBlockhash = async () => {
                try {
                    const latestBlockhash = await connection.getLatestBlockhash();
                    return latestBlockhash.blockhash;
                } catch (err) {
                    console.error('Error fetching latest blockhash:', err);
                    throw new Error('Error fetching blockhash');
                }
            };

            const sendTransaction = async (blockhash) => {
                try {
                    transaction.message.recentBlockhash = blockhash;
                    transaction.message.feePayer = wallet.publicKey;

                    const senderKeypair = Keypair.fromSecretKey(Uint8Array.from(wallet.privateKey));
                    transaction.sign([senderKeypair]);

                    const serializedTransaction = transaction.serialize();
                    const txid = await connection.sendRawTransaction(serializedTransaction, {
                        skipPreflight: false,
                    });

                    return txid;
                } catch (err) {
                    throw new Error('Error sending transaction');
                }
            };

            let blockhash = await getLatestBlockhash();
            let txid = await sendTransaction(blockhash);

            const checkTransactionStatus = async (txid) => {
                try {
                    const statuses = await connection.getSignatureStatuses([txid]);
                    if (statuses && statuses.value && statuses.value[0]) {
                        const status = statuses.value[0];
                        if (status.confirmationStatus === 'finalized') {
                            setTxId(txid);
                            return true;
                        }
                    }
                    return false;
                } catch (err) {
                    return false;
                }
            };

            let retries = 8;
            let confirmed = false;
            while (retries > 0 && !confirmed) {
                confirmed = await checkTransactionStatus(txid);
                if (!confirmed) {
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

        } catch (err) {
            console.error('Error performing swap:', err);
            setSwapPressed(false)
            setError(err.message || 'An error occurred during the swap');
        } finally {
            setIsSwapping(false);
        }
    };


    useEffect(() => {
        fetchSwapQuote();
    }, [inputAmount, inputMint, outputMint]);

    const openModal = (isInput) => {
        setIsSelectingInput(isInput);
        setModalVisible(true);
    };

    const selectToken = (token) => {
        if (isSelectingInput) {
            setInputMint(token.address);
            setInputDecimals(token.decimals);
        } else {
            setOutputMint(token.address);
            setOutputDecimals(token.decimals);
        }
        setModalVisible(false);
    };

    useEffect(() => {
        if (inputMint === outputMint) {
            setOutputMint(tokenList[0]?.address);
            setOutputDecimals(tokenList[0]?.decimals)
            if (inputMint === tokenList[0]?.address) {
                setOutputMint(tokenList[1]?.address);
                setOutputDecimals(tokenList[1]?.decimals)
            }
        }
    }, [inputMint, outputMint, inputDecimals, outputDecimals])


    const fetchTokenBalances = async (publicKey) => {
        try {
            const solBalanceLamports = await connection.getBalance(new PublicKey(publicKey));
            const solBalance = solBalanceLamports / 1e9;

            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                new PublicKey(publicKey),
                { programId: TOKEN_PROGRAM_ID }
            );

            const tokenList = tokenAccounts.value
                .map(({ pubkey, account }) => {
                    const { mint, tokenAmount } = account.data.parsed.info;
                    return {
                        address: pubkey.toString(),
                        mint,
                        balance: tokenAmount.uiAmount,
                        decimals: tokenAmount.decimals,
                    };
                })
                .filter(token => token.balance > 0);

            const solToken = {
                address: 'SOL',
                mint: 'So11111111111111111111111111111111111111112',
                balance: solBalance,
                decimals: 9,
            };

            const updatedTokenList = solBalance > 0
                ? [solToken, ...tokenList]
                : tokenList;

            setTokens(updatedTokenList);
        } catch (error) {
            console.error('Error fetching token balances:', error);
        }
    };

    return (
        <View style={styles.container}>
            {/* YOU PAY */}
            <View style={styles.swapContainer}>
                <Text style={styles.sectionTitle}>You Pay</Text>
                <View style={styles.tokenSelector}>
                    <TextInput
                        style={styles.amountInput}
                        keyboardType="numeric"
                        placeholder="0"
                        value={inputAmount}
                        onChangeText={(value) => {
                            setInputAmount(value);
                        }}
                        editable
                        placeholderTextColor={'gray'}
                    />
                    <TouchableOpacity style={styles.tokenButton} onPress={() => openModal(true)}>
                        {errorTokens.includes(inputMint) ? (
                            <View style={styles.tokenLogoPlaceholder1} />
                        ) : (
                            <FastImage
                                source={{ uri: `${tokenList.find((t) => t.address === inputMint)?.logoURI}` }}
                                style={styles.tokenImage1}
                                resizeMode={FastImage.resizeMode.contain}
                                onError={() => setErrorForToken(inputMint)}
                            />
                        )}
                        <Text style={styles.tokenButtonText}>
                            {tokenList.find((t) => t.address === inputMint)?.symbol || 'Select Token'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View>
                    <TouchableOpacity onPress={() => {
                        const balance = tokens.find((t) => t.mint === inputMint)?.balance;
                        setInputAmount(balance ? balance.toString() : '');
                    }}>
                        <Text style={{ textAlign: 'right', color: 'gray', marginRight: 12, fontFamily: "Inter_28pt-Bold" }}>{tokens.find((t) => t.mint === inputMint)?.balance === undefined ? ("0") : (tokens.find((t) => t.mint === inputMint)?.balance.toFixed(5))}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* SWAP BUTTON */}
            <TouchableOpacity
                style={styles.swapButton}
                onPress={() => {
                    const temp = inputMint;
                    setInputMint(outputMint);
                    setOutputMint(temp);
                    setInputDecimals(outputDecimals);
                    setOutputDecimals(inputDecimals);
                }}
            >
                <Text style={styles.swapButtonText}>⇅</Text>
            </TouchableOpacity>

            {/* YOU RECEIVE */}
            <View style={styles.swapContainer}>
                <Text style={styles.sectionTitle}>You Receive</Text>
                <View style={styles.tokenSelector}>
                    <TextInput
                        style={styles.amountInput}
                        keyboardType="numeric"
                        placeholder="0"
                        value={outputAmount?.toString()}
                        editable={false}
                        placeholderTextColor={'gray'}
                    />
                    <TouchableOpacity style={styles.tokenButton} onPress={() => openModal(false)}>
                        {errorTokens.includes(outputMint) ? (
                            <View style={styles.tokenLogoPlaceholder1} />
                        ) : (
                            <FastImage
                                source={{ uri: `${tokenList.find((t) => t.address === outputMint)?.logoURI}` }}
                                style={styles.tokenImage1}
                                resizeMode={FastImage.resizeMode.contain}
                                onError={() => setErrorForToken(outputMint)}
                            />
                        )}
                        <Text style={styles.tokenButtonText}>
                            {tokenList.find((t) => t.address === outputMint)?.symbol || 'Select Token'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View>
                    <Text style={{ textAlign: 'right', color: 'gray', marginRight: 12, fontFamily: "Inter_28pt-Bold" }}>{tokens.find((t) => t.mint === outputMint)?.balance === undefined ? ("0") : (tokens.find((t) => t.mint === outputMint)?.balance.toFixed(5))}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.performSwapButton} onPress={performSwap} disabled={isSwapping}>
                <Text style={styles.performSwapButtonText}>Swap</Text>
            </TouchableOpacity>

            {error && <Text style={styles.error}>{error}</Text>}

            {/* SWAP PROCESS MODAL */}
            <Modal visible={swapPressed} transparent={false} animationType="fade">
                <StatusBar barStyle="light-content" backgroundColor={"rgba(27, 27, 27, 0.88)"} />
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={styles.loader}>
                                <ActivityIndicator size="large" color="#deff89" animating={isSwapping} />
                            </View>
                            <Text style={styles.titleText}>{isSwapping ? ("Swapping tokens...") : ("Swap Done!")}</Text>
                            <Text style={styles.subtitleText}>
                                {tokenList.find((t) => t.address === outputMint)?.symbol} {isSwapping ? ("will be") : ("is")} deposited into your wallet
                                {isSwapping ? (" once the transaction is complete") : ("")}
                            </Text>
                        </View>
                        {txId && (
                            <TouchableOpacity style={styles.viewTransactionButton} onPress={() => openLink()}>
                                <Text style={styles.viewTransaction}>View Transaction</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.closeButtonContainer}>
                        <TouchableOpacity style={styles.closeSwapButton} onPress={() => { fetchTokenBalances(wallet.publicKey);setSwapPressed(false) }}>
                            <Text style={styles.closeSwapButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* TOKENS MODAL */}
            <Modal visible={isModalVisible} animationType="slide">
                <StatusBar barStyle="light-content" backgroundColor={"rgba(27, 27, 27, 0.88)"} />

                <View style={styles.modalContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <TouchableOpacity style={{ marginRight: 20 }} onPress={() => { setModalVisible(false) }}>
                            <Image source={require("../assets/close.png")} style={{ width: 16, height: 16 }} />
                        </TouchableOpacity>
                        <Text style={{ color: '#ffffff', fontSize: 18, fontFamily: "Inter_28pt-Bold" }}>Select Token</Text>
                    </View>
                    {/* Search Bar */}
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by symbol or address"
                        placeholderTextColor="#888"
                        onChangeText={(text) => setSearchQuery(text.toLowerCase())}
                        value={searchQuery}
                    />

                    <FlatList
                        data={filteredTokenList}
                        keyExtractor={(item) => item.address}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => selectToken(item)}>
                                {errorTokens.includes(item.address) ? (
                                    <View style={styles.tokenLogoPlaceholder} />
                                ) : (
                                    <FastImage
                                        source={{ uri: item.logoURI }}
                                        style={styles.tokenImage}
                                        resizeMode={FastImage.resizeMode.contain}
                                        onError={() => setErrorForToken(item.address)}
                                    />
                                )}
                                <Text style={styles.tokenText}>{item.symbol}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#1b1b1b' },
    sectionTitle: { fontSize: 14, fontFamily: "Inter_28pt-SemiBold", marginBottom: 10, color: '#e9e9e9' },
    swapContainer: { padding: 20, backgroundColor: '#303030', borderRadius: 20 },
    tokenSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 10 },
    amountInput: { flex: 1, fontSize: 26, padding: 5, color: '#ffffff', fontFamily: "Inter_28pt-Bold" },
    tokenButton: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#555555', borderRadius: 25 },
    tokenButtonText: { color: '#f1f1f1', marginLeft: 10, marginRight: 5, fontFamily: "Inter_28pt-SemiBold", },
    swapButton: { alignItems: 'center', marginTop: 5, marginBottom: 10, alignSelf: 'center' },
    performSwapButton: { alignItems: 'center', backgroundColor: '#aac467', borderRadius: 24, padding: 15, marginTop: 30 },
    performSwapButtonText: { fontFamily: "Inter_28pt-Bold", fontSize: 18, color: '#1b1b1b' },
    swapButtonText: { fontSize: 24, color: '#ffffff', fontFamily: "Inter_28pt-ExtraBold" },
    error: { color: '#a74f4f', textAlign: 'center', marginTop: 10 },
    modalContainer: { flex: 1, padding: 20, backgroundColor: '#1b1b1b' },
    searchInput: {
        height: 50,
        backgroundColor: '#202020',
        borderRadius: 8,
        paddingHorizontal: 16,
        color: '#ffffff',
        marginBottom: 10,
        fontFamily: "Inter_28pt-Medium",
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#303030',
        borderRadius: 10,
        marginVertical: 6,
    },
    tokenImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    tokenLogoPlaceholder: { width: 40, height: 40, backgroundColor: '#ccc', borderRadius: 50 },
    tokenLogoPlaceholder1: { width: 30, height: 30, backgroundColor: '#ccc', borderRadius: 20 },
    tokenImage1: {
        width: 30,
        height: 30,
        borderRadius: 20,
    },
    tokenText: {
        color: '#ffffff',
        fontSize: 16,
        marginLeft: 15,
        fontFamily: "Inter_28pt-Bold",
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(27, 27, 27, 1)',
        justifyContent: 'space-between',
    },
    modalContent: {
        marginTop: 50, // Space at the top
        marginHorizontal: 20,
        alignItems: 'center',
    },
    loader: {
        marginBottom: 20,
    },
    titleText: {
        fontSize: 24,
        fontFamily: "Inter_28pt-Bold",
        color: '#FFFFFF',
        marginBottom: 10,
    },
    subtitleText: {
        fontSize: 16,
        color: '#B3B3B3',
        textAlign: 'center',
        fontFamily: "Inter_28pt-Medium",
        marginHorizontal: 20,
    },
    viewTransactionButton: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#333333',
        borderRadius: 10,
    },
    viewTransaction: {
        color: '#deff89',
        fontFamily: "Inter_28pt-Bold",
        fontSize: 16,
    },
    closeButtonContainer: {
        padding: 20,
    },
    closeSwapButton: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        backgroundColor: '#b7d470',
        borderRadius: 24,
        alignItems: 'center',
    },
    closeSwapButtonText: {
        color: '#1b1b1b',
        fontFamily: "Inter_28pt-Bold",
        fontSize: 18,
    },
});

export default SwapScreen;
