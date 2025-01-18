import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, FlatList, StatusBar } from "react-native";
import Clipboard from '@react-native-clipboard/clipboard';
import { CommonActions, useNavigation } from "@react-navigation/native";

const ShowPass = ({ route }) => {

    const { walletData } = route.params;
    const navigation = useNavigation();

    const [walletPhrase, setWalletPhrase] = useState([]);
    const [walletPhrasetoCopy, setWalletPhrasetoCopy] = useState("");
    const [walletName, setWalletName] = useState("");

    useEffect(() => {
        setWalletPhrase(walletData.mnemonic.split(' '));
        setWalletPhrasetoCopy(walletData.mnemonic);
        setWalletName(walletData.name)
    }, []);

    const handleCopyMnemonic = () => {
        if (walletPhrase) {
            Clipboard.setString(walletPhrasetoCopy);
        }
    };

    const handleGoToWallet = () => {

        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{
                    name: "MainPage",
                }],
            })
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={"#1b1b1b"} barStyle={"light-content"} />
            <FlatList
                data={walletPhrase.map((word, index) => ({ key: `${index + 1}`, word }))}
                numColumns={3}
                renderItem={({ item }) => (
                    <View style={styles.wordContainer}>
                        <Text style={styles.wordIndex}>{item.key < 10 ? (`0${item.key}`) : (item.key)}.</Text>
                        <Text style={styles.word}>{item.word}</Text>
                    </View>
                )}
                keyExtractor={(item) => item.key}
            />
            <TouchableOpacity style={styles.copyButton1} onPress={handleCopyMnemonic}>
                <Text style={styles.copyButtonText1}>Copy Passphrase</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyButton} onPress={handleGoToWallet}>
                <Text style={styles.copyButtonText}>Go To Wallet</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#1b1b1b',
        padding: 20,
        alignItems: 'center',
    },
    wordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 12,
        margin: 4,
        backgroundColor: '#2c2c2c',
        borderRadius: 12,
        width: 110,
    },
    wordIndex: {
        fontSize: 14,
        fontFamily: "Inter_28pt-Bold",
        marginRight: 6,
        color: '#deff89',
    },
    word: {
        fontSize: 14,
        fontFamily: "Inter_28pt-Medium",
        color: '#ffffff',
    },
    copyButton: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#b7d470',
        borderRadius: 25,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    copyButtonText: {
        color: '#1b1b1b',
        fontSize: 18,
        fontFamily: "Inter_28pt-Bold",
    },
    copyButton1: {
        padding: 15,
        backgroundColor: '#393939',
        borderRadius: 25,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    copyButtonText1: {
        color: '#e5e5e5',
        fontSize: 18,
        fontFamily: "Inter_28pt-Bold",
    },
});

export default ShowPass;
