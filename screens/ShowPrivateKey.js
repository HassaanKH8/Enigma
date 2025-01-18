import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useNavigation } from "@react-navigation/native";
import bs58 from "bs58";

const ShowPrivateKey = ({ route }) => {
    const { walletData } = route.params
    const navigation = useNavigation();
    const [privateKeyBase58, setPrivateKeyBase58] = useState("");

    useEffect(() => {
        const privateKeyArray = walletData.privateKey;
        const privateKeyBuffer = Buffer.from(privateKeyArray);
        const privateKeyBase58 = bs58.encode(privateKeyBuffer);
        setPrivateKeyBase58(privateKeyBase58);

    }, []);

    const handleCopyPrivateKey = () => {
        if (privateKeyBase58) {
            Clipboard.setString(privateKeyBase58);
        }
    };

    const handleGoToWallet = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "MainPage" }],
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={"#1b1b1b"} barStyle={"light-content"} />
            <Text style={styles.title}>Your Private Key</Text>
            <ScrollView contentContainerStyle={styles.keyContainer}>
                <Text style={styles.keyText}>{privateKeyBase58}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyPrivateKey}>
                <Text style={styles.copyButtonText}>Copy Private Key</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.goBackButton} onPress={handleGoToWallet}>
                <Text style={styles.goBackButtonText}>Go To Wallet</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1b1b1b",
        padding: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 20,
        fontFamily: "Inter_28pt-Bold",
        color: "#deff89",
        marginBottom: 20,
    },
    keyContainer: {
        backgroundColor: "#2c2c2c",
        borderRadius: 15,
        padding: 20,
        marginVertical: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    keyText: {
        color: "#ffffff",
        fontSize: 16,
        lineHeight: 24,
        fontFamily: "Inter_28pt-Medium",
        textAlign: "center",
    },
    copyButton: {
        padding: 15,
        backgroundColor: "#b7d470",
        borderRadius: 25,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    copyButtonText: {
        color: "#1b1b1b",
        fontSize: 18,
        fontFamily: "Inter_28pt-Bold",
    },
    goBackButton: {
        marginTop: 15,
        padding: 15,
        backgroundColor: "#393939",
        borderRadius: 25,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    goBackButtonText: {
        color: "#e5e5e5",
        fontSize: 18,
        fontFamily: "Inter_28pt-Bold",
    },
});

export default ShowPrivateKey;
