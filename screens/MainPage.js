import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { loadWallet, getWalletBalance } from '../components/walletUtils';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import EncryptedStorage from 'react-native-encrypted-storage';

const MainPage = () => {
    const navigation = useNavigation();
    const [wallet, setWallet] = useState(null);
    const [balance, setBalance] = useState(null);
    const [tokens, setTokens] = useState([]);
    const [tokenPrices, setTokenPrices] = useState({});
    const [tokenMetadata, setTokenMetadata] = useState({});
    const [loading, setLoading] = useState(false);

    const WEBSOCKET_HTTPS_URL = "https://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"
    const WEBSOCKET_WSS_URL = "wss://burned-rough-brook.solana-mainnet.quiknode.pro/28c9fa03c2f3e9522603bcd6118ee5bbb6d5afe0/"

    const connection = new Connection(WEBSOCKET_HTTPS_URL, {
        wsEndpoint: WEBSOCKET_WSS_URL,
    });

    const initializeWallet = async () => {
        const walletData = await loadWallet();
        const activeWalletIndexString = await EncryptedStorage.getItem('activeWalletIndex')
        const activeWalletIndex = activeWalletIndexString ? JSON.parse(activeWalletIndexString) : 0;

        if (walletData) {
            setWallet(walletData[activeWalletIndex]);
            await fetchWalletDetails(walletData[activeWalletIndex]);
            await fetchTokenMetadata();
        }
    };

    useEffect(() => {
        initializeWallet();
    }, []);

    const fetchTokenMetadata = async () => {
        try {
            const response = await fetch('https://tokens.jup.ag/tokens?tags=verified');
            const tokens = await response.json();

            const metadataMap = tokens.reduce((acc, token) => {
                acc[token.address] = {
                    name: token.name,
                    logoURI: token.logoURI,
                    symbol: token.symbol,
                };
                return acc;
            }, {});
            setTokenMetadata(metadataMap);
        } catch (error) {
            console.error('Error fetching token metadata:', error);
        }
    };

    const fetchWalletDetails = async (walletData) => {
        try {
            setLoading(true)
            const walletBalance = await getWalletBalance(walletData.publicKey, connection);
            setBalance(walletBalance);

            const tokenList = await fetchTokenBalances(walletData.publicKey);
            await fetchTokenPrices(tokenList);
            setLoading(false)
        } catch (error) {
            console.error('Error fetching wallet details:', error);
            setLoading(false)
        }
    };

    const fetchTokenBalances = async (publicKey) => {
        try {
            const solBalanceLamports = await connection.getBalance(new PublicKey(publicKey));
            const solBalance = solBalanceLamports / 1e9;

            const tokenAccountsOldProgram = await connection.getParsedTokenAccountsByOwner(
                new PublicKey(publicKey),
                { programId: TOKEN_PROGRAM_ID }
            );

            const tokenAccountsNewProgram = await connection.getParsedTokenAccountsByOwner(
                new PublicKey(publicKey),
                { programId: TOKEN_2022_PROGRAM_ID }
            );

            const combinedTokenAccounts = [
                ...tokenAccountsOldProgram.value,
                ...tokenAccountsNewProgram.value
            ];

            const tokenList = combinedTokenAccounts?.map(({ pubkey, account }) => {
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
                balance: 41.12,
                decimals: 9,
            };

            const updatedTokenList = solBalance > 0
                ? [solToken, ...tokenList]
                : tokenList;

            setTokens(updatedTokenList);
            return updatedTokenList;
        } catch (error) {
            console.error('Error fetching token balances:', error);
        }
    };



    const fetchTokenPrices = async (tokenList) => {
        try {
            const ids = tokenList.map((token) => token.mint).join(',');
            const response = await fetch(`https://api.jup.ag/price/v2?ids=${ids}&showExtraInfo=true`);
            const data = await response.json();

            if (data?.data) {
                setTokenPrices(data.data);
            }

        } catch (error) {
            console.error('Error fetching token prices:', error);
        }
    };

    const handleSendTransaction = () => {
        navigation.navigate('SendTransactionScreen', { walletData: wallet });
    };

    const calculateTotalBalance = () => {
        const tokenBalance = tokens.reduce((acc, token) => {
            const price = tokenPrices[token.mint]?.price || 0;
            return acc + token.balance * price;
        }, 0);

        return tokenBalance;
    };

    useFocusEffect(
        useCallback(() => {
            initializeWallet()
        }, [])
    );

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={"#1b1b1b"} barStyle={'light-content'} />
            <TouchableOpacity style={{ marginLeft: 5, flexDirection: 'row', alignItems: 'center', marginBottom: 20 }} onPress={() => { navigation.navigate("WalletOptions", { activeWallet: wallet }) }}>
                <Image source={require("../assets/wallet.png")} style={{ width: 24, height: 24 }} />
                <Text style={{ color: '#c5c5c5', fontSize: 15, fontFamily: 'Inter_28pt-SemiBold', letterSpacing: 0.5, marginLeft: 10 }}>{wallet?.name}</Text>
            </TouchableOpacity>
            {/* Total Balance */}
            <View style={styles.balanceSection}>
                <Text style={styles.totalBalance}>
                    ${calculateTotalBalance().toFixed(2)}
                </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("ReceiveScreen", { walletData: wallet })}>
                    <Image source={require('../assets/qr-code.png')} style={{ height: 35, width: 35, marginTop: 5 }} />
                    <Text style={styles.buttonText}>Receive</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleSendTransaction}>
                    <Image source={require('../assets/send.png')} style={{ height: 35, width: 35, marginTop: 5 }} />
                    <Text style={styles.buttonText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("SwapScreen", { walletData: wallet })}>
                    <Image source={require('../assets/swap.png')} style={{ height: 35, width: 35, marginTop: 5 }} />
                    <Text style={styles.buttonText}>Swap</Text>
                </TouchableOpacity>
            </View>

            {/* Token List */}
            {loading && (
                <View style={{ marginTop: 10, marginBottom: 20 }}>
                    <ActivityIndicator size={'large'} color={"#dbff7e"} animating={loading} />
                </View>
            )}
            <FlatList
                data={tokens}
                keyExtractor={(item) => item.address}
                renderItem={({ item }) => {
                    const price = tokenPrices[item.mint]?.price || 0;
                    const valueInUSD = (item.balance * price).toFixed(2);

                    const metadata = tokenMetadata[item.mint] || {};
                    const tokenName = metadata.name || 'Unknown Token';
                    const tokenLogoURI = metadata.logoURI;
                    const symbol = metadata.symbol;

                    return (
                        <View style={styles.tokenItem}>
                            <View style={styles.tokenContainer1}>
                                {tokenLogoURI ? (
                                    <FastImage
                                        source={{ uri: tokenLogoURI }}
                                        style={styles.tokenLogo}
                                        resizeMode={FastImage.resizeMode.contain}
                                    />
                                ) : (
                                    <View style={styles.tokenLogoPlaceholder} />
                                )}
                                <View>
                                    <Text style={styles.tokenName}>{symbol !== undefined && symbol}</Text>
                                    <Text style={styles.tokenBalance}>{item.balance.toFixed(5)} {symbol !== undefined && symbol}</Text>
                                </View>
                            </View>
                            <View>
                                <Text style={styles.tokenPrice}>{`$${valueInUSD}`}</Text>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: "#1b1b1b" },
    balanceSection: { marginBottom: 20 },
    totalBalance: { fontSize: 64, fontFamily: "Inter_28pt-ExtraBold", color: '#ffffff', textAlign: "center", marginBottom: 40, marginTop: 10 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    button: { flex: 1, backgroundColor: '#303030', paddingVertical: 15, marginHorizontal: 5, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#a1a1a1', fontSize: 14, marginTop: 10, fontFamily: 'Inter_28pt-SemiBold' },
    tokenItem: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16, marginVertical: 6, backgroundColor: "#303030" },
    tokenContainer1: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
    tokenName: { fontSize: 20, fontFamily: "Inter_28pt-Bold", flex: 1, color: "#f5f5f5" },
    tokenBalance: { fontSize: 14, color: "#c2c2c2", fontFamily: "Inter_28pt-Regular" },
    tokenPrice: { fontSize: 18, color: '#ffffff', fontFamily: "Inter_28pt-SemiBold", marginRight: 5 },
    tokenLogo: { width: 50, height: 50, marginRight: 8, borderRadius: 50 },
    tokenLogoPlaceholder: { width: 50, height: 50, backgroundColor: '#ccc', marginRight: 8, borderRadius: 50 },
});
// #dbff7e
export default MainPage;
