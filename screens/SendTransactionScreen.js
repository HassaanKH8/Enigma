import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    Image,
    Linking,
} from 'react-native';
import { Connection, PublicKey, Transaction, Keypair, ComputeBudgetProgram, SystemProgram } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import axios from 'axios';
import FastImage from 'react-native-fast-image';
import { Camera } from 'react-native-camera-kit';

const SendTransactionScreen = ({ navigation, route }) => {
    const { walletData } = route.params;
    const [amount, setAmount] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [txId, setTxId] = useState(null);
    const [availableTokens, setAvailableTokens] = useState([]);
    const [availableTokensLength, setAvailableTokensLength] = useState(null);
    const [selectedToken, setSelectedToken] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [tokenDecimals, setTokenDecimals] = useState(6);
    const [errorTokens, setErrorTokens] = useState([]);
    const [recipientAddressDone, setRecipientAddressDone] = useState(false);
    const [sendPressed, setSendPressed] = useState(false);
    const [recipientAddressValid, setRecipientAddressValid] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [maxAmount, setMaxAmount] = useState(false);

    const WEBSOCKET_HTTPS_URL = "https://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"
    const WEBSOCKET_WSS_URL = "wss://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"

    const connection = new Connection(WEBSOCKET_HTTPS_URL, {
        wsEndpoint: WEBSOCKET_WSS_URL,
    });

    useEffect(() => {
        const initializeWallet = async () => {
            if (walletData) {
                setWallet(walletData);
                await loadTokens(walletData);
            }
        };
        setLoadingTokens(true)
        initializeWallet();
    }, []);

    const setErrorForToken = (tokenAddress) => {
        setErrorTokens((prev) => [...prev, tokenAddress]);
    };

    const openLink = () => {
        Linking.openURL(`https://solscan.io/tx/${txId}`);
    };

    useEffect(() => {
        const getMaxAmount = async () => {
            const accountInfo = await connection.getAccountInfo(new PublicKey(wallet.publicKey))
            const rent = await connection.getMinimumBalanceForRentExemption(accountInfo.data.length)
            const senderWallet = Keypair.fromSecretKey(Uint8Array.from(wallet.privateKey));
            const senderBalance = await connection.getBalance(senderWallet.publicKey);
            const maxSendableAmount = senderBalance - rent - 5000
            if (maxSendableAmount > 0) {
                setMaxAmount(maxSendableAmount);
            }
            else {
                setMaxAmount(0)
            }
        }
        getMaxAmount()
    }, [selectedToken])

    const fetchJupiterTokens = async () => {
        try {
            const response = await axios.get('https://tokens.jup.ag/tokens?tags=verified');
            return response.data.reduce((map, token) => {
                map[token.address] = token;
                return map;
            }, {});
        } catch (error) {
            console.error('Error fetching Jupiter tokens:', error);
            return {};
        }
    };

    const loadTokens = async (walletData) => {
        try {
            const walletKey = Keypair.fromSecretKey(Uint8Array.from(walletData.privateKey)).publicKey;

            const solBalanceLamports = await connection.getBalance(new PublicKey(walletKey));
            const solBalance = solBalanceLamports / 1e9;

            const tokenAccountsV1 = await connection.getParsedTokenAccountsByOwner(walletKey, {
                programId: splToken.TOKEN_PROGRAM_ID,
            });

            const tokenAccountsV2 = await connection.getParsedTokenAccountsByOwner(walletKey, {
                programId: splToken.TOKEN_2022_PROGRAM_ID,
            });

            const allTokenAccounts = [...tokenAccountsV1.value, ...tokenAccountsV2.value];
            const jupiterTokens = await fetchJupiterTokens();

            const tokens = allTokenAccounts.map(account => {
                const tokenInfo = account.account.data.parsed.info;
                const mintAddress = tokenInfo.mint;
                const tokenMetadata = jupiterTokens[mintAddress];

                return {
                    mintAddress,
                    symbol: tokenMetadata ? tokenMetadata.symbol : 'Unknown',
                    balance: tokenInfo.tokenAmount.uiAmount || 0,
                    decimals: tokenInfo.tokenAmount.decimals,
                    logoURI: tokenInfo.logoURI
                };
            }).filter(token => token.balance > 0);

            const solToken = {
                mintAddress: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                balance: solBalance,
                decimals: 9,
                logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            };

            const updatedTokens = solBalance > 0 ? [solToken, ...tokens] : tokens;
            setAvailableTokens(updatedTokens);
            setAvailableTokensLength(updatedTokens.length)
            setLoadingTokens(false)
        } catch (error) {
            console.error('Error loading tokens:', error);
            Alert.alert('Error', 'Unable to load tokens');
            setLoadingTokens(false)
        }
    };

    const handleTokenPress = async (token) => {
        setSelectedToken(token);
        setTokenDecimals(token.decimals);
        setModalVisible(true);
    };

    const closemodal = () => {
        setModalVisible(false);
        setRecipientAddress("");
        setRecipientAddressDone(false);
        setAmount('')
        setSendPressed('')
    }

    const sendToken = async () => {
        if (!amount || !recipientAddress || !wallet || !selectedToken) {
            Alert.alert('Error', 'Please provide amount, recipient address, and ensure the wallet is loaded.');
            return;
        }

        try {
            setSendPressed(true);
            setLoading(true);

            const senderWallet = Keypair.fromSecretKey(Uint8Array.from(wallet.privateKey));
            const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, tokenDecimals));

            if (selectedToken.mintAddress === 'So11111111111111111111111111111111111111112') {
                const maxSendableAmount = maxAmount;
                if (parseFloat(amount) * Math.pow(10, 9) > maxSendableAmount) {
                    Alert.alert('Error', `Not enough SOL.`);
                    navigation.goBack()
                    return;
                }

                const transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: senderWallet.publicKey,
                        toPubkey: new PublicKey(recipientAddress),
                        lamports: amountInSmallestUnit,
                    })
                );

                transaction.feePayer = senderWallet.publicKey;
                const { blockhash } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;

                const signature = await connection.sendTransaction(transaction, [senderWallet], {
                    skipPreflight: false,
                    preflightCommitment: 'processed',
                });

                setTxId(signature);
            } else {
                const tokenMint = new PublicKey(selectedToken.mintAddress);

                const senderTokenAccount = await splToken.getAssociatedTokenAddress(
                    tokenMint,
                    senderWallet.publicKey
                );

                const recipientTokenAccount = await splToken.getAssociatedTokenAddress(
                    tokenMint,
                    new PublicKey(recipientAddress)
                );

                const transaction = new Transaction();

                const senderTokenAccountInfo = await connection.getAccountInfo(senderTokenAccount);
                if (!senderTokenAccountInfo) {
                    throw new Error('Sender does not have the associated token account for this token.');
                }

                const recipientTokenAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
                if (!recipientTokenAccountInfo) {
                    transaction.add(
                        splToken.createAssociatedTokenAccountInstruction(
                            senderWallet.publicKey,
                            recipientTokenAccount,
                            new PublicKey(recipientAddress),
                            tokenMint
                        )
                    );
                }

                transaction.add(
                    splToken.createTransferInstruction(
                        senderTokenAccount,
                        recipientTokenAccount,
                        senderWallet.publicKey,
                        amountInSmallestUnit
                    )
                );

                transaction.feePayer = senderWallet.publicKey;
                const fee = 50000;
                transaction.add(ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: fee,
                }));

                const { blockhash } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;

                const signature = await connection.sendTransaction(transaction, [senderWallet], {
                    skipPreflight: false,
                    preflightCommitment: 'processed',
                });

                setTxId(signature);
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const onScanQRCode = (event) => {
        setRecipientAddress(event.nativeEvent.codeStringValue);
        setScanning(false);
        try {
            const recipientPublicKey = new PublicKey(event.nativeEvent.codeStringValue);
            if (PublicKey.isOnCurve(recipientPublicKey.toBytes())) {
                setRecipientAddressValid(true);
            } else {
                setRecipientAddressValid(false);
            }
        } catch (error) {
            setRecipientAddressValid(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity style={{ marginRight: 20 }} onPress={() => { navigation.goBack() }}>
                    <Image source={require("../assets/close.png")} style={{ width: 16, height: 16 }} />
                </TouchableOpacity>
                <Text style={styles.header}>Select Token</Text>
            </View>
            {loadingTokens ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#deff89" animating={loadingTokens} />
                </View>
            ) : (
                <View>
                    {availableTokensLength !== 0 ? (
                        <FlatList
                            data={availableTokens}
                            keyExtractor={(item) => item.mintAddress}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.tokenItem}
                                    onPress={() => handleTokenPress(item)}
                                >
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
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={styles.tokenText}>{item.symbol}</Text>
                                        <Text style={styles.tokenBText}>{item.balance.toFixed(4)}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View style={{ marginTop: 20 }}>
                            <Text style={{ textAlign: 'center', fontFamily: "Inter_28pt-Bold", color: '#ffffff', fontSize: 18 }}>No Tokens Available to Send</Text>
                            <Text style={{ textAlign: 'center', fontFamily: "Inter_28pt-Medium", color: '#757575', fontSize: 14, width: '70%', alignSelf: 'center', marginTop: 6 }}>You must deposit funds before sending it to another address!</Text>
                        </View>
                    )}
                </View>
            )}
            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => closemodal()}
            >
                {scanning && (
                    <View>
                        <TouchableOpacity style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }} onPress={() => { setScanning(false) }}>
                            <Text style={{ backgroundColor: '#1b1b1b', color: '#dbf98f', textAlign: 'center', padding: 10, borderRadius: 10, fontFamily: 'Inter_28pt-Bold' }}>Cancel</Text>
                        </TouchableOpacity>
                        <Camera
                            scanBarcode={true}
                            onReadCode={onScanQRCode}
                            style={styles.camera}
                        />
                    </View>
                )}
                <View style={styles.modalView}>
                    <StatusBar backgroundColor={"rgba(27,27,27,0.88)"} />
                    {!sendPressed && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <TouchableOpacity style={{ marginRight: 20 }} onPress={() => { closemodal() }}>
                                <Image source={require("../assets/close.png")} style={{ width: 16, height: 16 }} />
                            </TouchableOpacity>
                            <Text style={styles.modalHeader}>{recipientAddressDone ? `Enter Amount (${selectedToken?.symbol})` : `Send ${selectedToken?.symbol}`}</Text>
                        </View>
                    )}
                    {recipientAddressDone ? (
                        <View style={{ width: "100%" }}>
                            {sendPressed ? (
                                <View style={styles.modalBackground}>
                                    <View style={styles.modalContent}>
                                        <View style={{ alignItems: 'center' }}>
                                            <View style={styles.loader}>
                                                <ActivityIndicator size="large" color="#deff89" animating={loading} />
                                            </View>
                                            <Text style={styles.titleText}>{loading ? ("Sending tokens...") : ("Done!")}</Text>
                                        </View>
                                        {txId && (
                                            <TouchableOpacity style={styles.viewTransactionButton} onPress={() => openLink()}>
                                                <Text style={styles.viewTransaction}>View Transaction</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.closeButtonContainer}>
                                        <TouchableOpacity style={styles.closeSwapButton} onPress={() => { closemodal() }}>
                                            <Text style={styles.closeSwapButtonText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    <Text style={styles.simpletext}>{`Sending to:  ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-6)}`}</Text>

                                    <TextInput
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        style={styles.input}
                                        placeholderTextColor={'gray'}
                                    />
                                    <TouchableOpacity onPress={() => { setAmount(selectedToken.mintAddress === "So11111111111111111111111111111111111111112" ? (((maxAmount) / 1e9).toFixed(tokenDecimals).toString()) : (selectedToken.balance).toFixed(tokenDecimals).toString()) }}>
                                        <Text style={styles.simpletext2}>{selectedToken.mintAddress === "So11111111111111111111111111111111111111112" ? `${(maxAmount / 1e9).toFixed(tokenDecimals)}` : `${selectedToken.balance.toFixed(tokenDecimals)}`}</Text>
                                    </TouchableOpacity>
                                    <View style={styles.buttonContainer2}>
                                        <TouchableOpacity style={{ paddingVertical: 15, paddingHorizontal: 30, backgroundColor: amount === '' || amount === '0' ? ('#7e8c5a') : ('#b7d470'), borderRadius: 24, alignItems: 'center' }} disabled={recipientAddress === "" ? (true) : (false)} onPress={() => { sendToken() }}>
                                            <Text style={{ color: amount === '' || amount === '0' ? ('#3b3b3b') : ('#1b1b1b'), fontFamily: 'Inter_28pt-Bold', fontSize: 18 }}>Send</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>

                    ) : (
                        <View style={{ width: "100%" }}>
                            <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: 'space-evenly' }}>
                                <TextInput
                                    value={recipientAddress}
                                    onChangeText={(e) => {
                                        setRecipientAddress(e);
                                        try {
                                            const recipientPublicKey = new PublicKey(e);
                                            if (PublicKey.isOnCurve(recipientPublicKey.toBytes())) {
                                                setRecipientAddressValid(true);
                                            } else {
                                                setRecipientAddressValid(false);
                                            }
                                        } catch (error) {
                                            setRecipientAddressValid(false);
                                        }
                                    }}
                                    placeholder="Recipient Address"
                                    style={styles.input2}
                                    placeholderTextColor={'gray'}
                                />
                                <TouchableOpacity onPress={() => { setScanning(true) }} style={{ marginLeft: 10 }}>
                                    <Image source={require('../assets/qr-code.png')} style={{ width: 24, height: 24 }} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={{ paddingVertical: 15, paddingHorizontal: 30, backgroundColor: recipientAddressValid ? ('#b7d470') : ('#7e8c5a'), borderRadius: 24, alignItems: 'center' }} disabled={recipientAddressValid ? (false) : (true)} onPress={() => { setRecipientAddressDone(true) }}>
                                    <Text style={{ color: recipientAddressValid ? ('#1b1b1b') : ('#3b3b3b'), fontFamily: 'Inter_28pt-Bold', fontSize: 18 }}>Next</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </Modal >
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#1b1b1b' },
    header: {
        fontSize: 20,
        fontFamily: 'Inter_28pt-Bold',
        color: '#ffffff'
    },
    tokenItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#303030',
        borderRadius: 10,
        marginVertical: 6,
    },
    tokenImage: {
        width: 50,
        height: 50,
        borderRadius: 50,
    },
    simpletext: {
        color: 'gray',
        fontSize: 17,
        marginBottom: 50,
        fontFamily: 'Inter_28pt-Bold',
    },
    simpletext2: {
        color: 'gray',
        fontSize: 17,
        fontFamily: 'Inter_28pt-Bold',
        textAlign: 'right',
        marginRight: 10,
        marginTop: 50
    },
    tokenLogoPlaceholder: { width: 50, height: 50, backgroundColor: '#ccc', borderRadius: 50 },
    tokenText: { fontSize: 18, color: '#ffffff', fontFamily: 'Inter_28pt-Bold', },
    tokenBText: { fontSize: 16, color: '#c2c2c2', fontFamily: 'Inter_28pt-Medium', },
    modalView: { flex: 1, backgroundColor: '#1b1b1b', padding: 20 },
    modalHeader: { fontSize: 20, fontFamily: 'Inter_28pt-Bold', color: '#fff', alignSelf: 'flex-start' },
    input: {
        marginTop: 50,
        width: '100%',
        backgroundColor: '#1b1b1b',
        textAlign: 'center',
        fontSize: 54,
        borderRadius: 10,
        color: '#ffffff',
        marginBottom: 10,
        fontFamily: 'Inter_28pt-Bold',
        paddingHorizontal: 20
    },
    input2: {
        width: '85%',
        height: 64,
        fontSize: 16,
        backgroundColor: '#2a2a2a',
        borderRadius: 20,
        color: '#ffffff',
        paddingHorizontal: 20,
        fontFamily: 'Inter_28pt-SemiBold',
    },
    camera: {
        height: '100%',
        width: '100%',
    },
    buttonContainer: { marginTop: 50, width: '100%' },
    buttonContainer2: { marginTop: 30, width: '100%' },
    closeButtonContainer: {
        padding: 20,
    },
    modalBackground: {
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
        color: '#FFFFFF',
        fontFamily: 'Inter_28pt-Bold',
        marginBottom: 10,
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
        fontFamily: 'Inter_28pt-Bold',
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
        fontFamily: 'Inter_28pt-Bold',
        fontSize: 18,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
    },
});

export default SendTransactionScreen;
