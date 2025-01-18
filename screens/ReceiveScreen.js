import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';

const ReceiveScreen = ({ navigation, route }) => {
    const { walletData } = route.params
    const [walletAddress, setWalletAddress] = useState('');
    const [copied, setCopied] = useState(false);
    const accentColor = '#000000';

    useEffect(() => {
        if (walletData?.publicKey) {
            setWalletAddress(walletData.publicKey);
        } else {
            setError('Wallet is not initialized correctly');
        }
    }, []);

    const copyToClipboard = () => {
        Clipboard.setString(walletAddress);
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 2000)
    };

    const shareWalletAddress = async () => {
        if (!walletAddress) {
            Alert.alert('Error', 'Wallet address not available');
            return;
        }

        try {
            await Share.share({
                message: `${walletAddress}`,
            });
        } catch (error) {
            console.error('Error sharing wallet address:', error);
        }
    };


    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={() => { navigation.goBack() }}>
                <Image source={require("../assets/close.png")} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
            {walletAddress ? (
                <>
                    <View style={{ padding: 16, backgroundColor: '#ffffff', borderRadius: 20 }}>
                        <QRCode
                            value={walletAddress}
                            size={180}
                            backgroundColor="#ffffff"
                            color={accentColor}
                        />
                    </View>
                    <Text style={styles.header}>Your Solana Address</Text>
                    <Text style={styles.simpletext}>Use this address to receieve tokens on <Text style={{ fontWeight: 'bold', color: "#deff89" }}>Solana</Text>.</Text>
                    <View style={{ width: '100%' }}>
                        <TouchableOpacity style={styles.copyButton1} onPress={copyToClipboard}>
                            <Text style={styles.copyButtonText1}>{copied ? "Copied!" : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`}</Text>
                            <Image source={require('../assets/copy.png')} style={{ height: 20, width: 20, marginLeft: 10 }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.copyButton} onPress={shareWalletAddress}>
                            <Text style={styles.copyButtonText}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <Text style={styles.loadingText}>Loading wallet address...</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b1b1b',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        fontSize: 24,
        color: '#ffffff',
        fontFamily: 'Inter_28pt-Bold',
        marginTop: 40,
        marginBottom: 10,
    },
    simpletext: {
        color: 'gray',
        fontSize: 16,
        width: '60%',
        textAlign: 'center',
        fontFamily: 'Inter_28pt-Medium',
        marginBottom: 50
    },
    copyButton1: {
        width: '100%',
        justifyContent: 'center',
        marginTop: 20,
        backgroundColor: '#383838',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: "center"
    },
    copyButtonText1: {
        color: '#ffffff',
        fontFamily: 'Inter_28pt-Bold',
        fontSize: 16,
    },
    copyButton: {
        width: '100%',
        justifyContent: 'center',
        marginTop: 20,
        backgroundColor: '#deff89',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: "center"
    },
    copyButtonText: {
        color: '#1b1b1b',
        fontFamily: 'Inter_28pt-Bold',
        fontSize: 18,
    },
    loadingText: {
        color: '#ffffff',
        fontSize: 18,
        fontFamily: 'Inter_28pt-Bold',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
    },
});

export default ReceiveScreen;
