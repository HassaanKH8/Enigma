import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { loadWallet } from "../components/walletUtils";
import EncryptedStorage from "react-native-encrypted-storage";

const WalletOptions = ({ route }) => {
    const { activeWallet } = route.params;
    const navigation = useNavigation();

    const [wallets, setWallets] = useState([]);

    useEffect(() => {
        const getWallets = async () => {
            const walletList = await loadWallet();
            setWallets(walletList);
        };
        getWallets();
    }, []);

    const handleViewPhrase = () => {
        navigation.navigate("ShowPass", { walletData: activeWallet });
    };

    const handleViewPrivateKey = () => {
        navigation.navigate("ShowPrivateKey", { walletData: activeWallet });
    };

    const addNewWallet = async () => {
        navigation.navigate("WalletInit");
    };

    const isSelectedWallet = (item) => {
        return item.name === activeWallet.name;
    };

    const handleItemPress = async (index) => {
        try {
            await EncryptedStorage.setItem('activeWalletIndex', JSON.stringify(index));
            navigation.goBack();
        } catch (error) {
            console.error('Error storing active wallet index:', error);
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={wallets}
                keyExtractor={(item) => item.publicKey}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        style={[
                            styles.walletItem,
                            isSelectedWallet(item) && styles.selectedWallet,
                        ]}
                        onPress={()=>{handleItemPress(index)}}
                    >
                        <Text style={[
                            styles.walletText,
                            isSelectedWallet(item) && styles.selectedWalletText,
                        ]}>{`Wallet ${index + 1}`}</Text>
                        <Text style={[
                            styles.walletPublicKey,
                            isSelectedWallet(item) && styles.selectedWalletPublicKey,
                        ]}>{item.publicKey.slice(0, 6)}...{item.publicKey.slice(-6)}</Text>
                    </TouchableOpacity>
                )}
                style={styles.walletList}
            />

            <TouchableOpacity style={styles.button1} onPress={addNewWallet}>
                <Text style={styles.buttonText1}>Add New Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button1} onPress={handleViewPrivateKey}>
                <Text style={styles.buttonText1}>View Private Key</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleViewPhrase}>
                <Text style={styles.buttonText}>View Wallet Phrase</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1b1b1b",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    walletList: {
        width: "100%",
        marginBottom: 20,
    },
    walletItem: {
        backgroundColor: "#353535",
        padding: 15,
        borderRadius: 15,
        marginVertical: 8,
        width: "100%",
    },
    selectedWallet: {
        backgroundColor: "#b7d470",
    },
    walletText: {
        fontSize: 16,
        fontFamily: "Inter_28pt-Bold",
        color: "#ffffff",
    },
    selectedWalletText:{
        fontSize: 16,
        fontFamily: "Inter_28pt-Bold",
        color: "#202020",
    },
    walletPublicKey: {
        fontSize: 16,
        fontFamily: "Inter_28pt-Medium",
        color: "#a1a1a1",
        marginTop: 6,
    },
    selectedWalletPublicKey: {
        fontSize: 16,
        fontFamily: "Inter_28pt-Medium",
        color: "#4c4c4c",
        marginTop: 6,
    },
    button1: {
        backgroundColor: "#353535",
        padding: 15,
        borderRadius: 25,
        width: "100%",
        alignItems: "center",
        marginVertical: 10,
    },
    buttonText1: {
        color: "#f1f1f1",
        fontSize: 18,
        fontFamily: "Inter_28pt-Bold",
    },
    button: {
        backgroundColor: "#b7d470",
        padding: 15,
        borderRadius: 25,
        width: "100%",
        alignItems: "center",
        marginVertical: 10,
    },
    buttonText: {
        color: "#1b1b1b",
        fontSize: 18,
        fontFamily: "Inter_28pt-Bold",
    },
});

export default WalletOptions;
