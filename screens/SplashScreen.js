import { useNavigation } from "@react-navigation/native";
import React, { useEffect } from "react";
import { StyleSheet, Text, View, StatusBar } from "react-native";
import { loadWallet } from "../components/walletUtils";

const SplashScreen = () => {
    const navigation = useNavigation();

    useEffect(() => {
        const checkWalletAndNavigate = async () => {
            const wallet = await loadWallet();
            
            if (wallet) {
                setTimeout(() => {
                    navigation.replace('MainPage');
                }, 2000);
            } else {
                setTimeout(() => {
                    navigation.replace('WalletInit');
                }, 2000);
            }
        };

        checkWalletAndNavigate();
    }, [navigation]);

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={'#bddc6e'} barStyle={'dark-content'}/>
            <Text style={styles.text}>Enigma</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#bddc6e',
    },
    text: {
        fontSize: 112,
        width: '100%',
        marginRight: 10,
        marginBottom: 60,
        textAlign:'center',
        color: '#000000',
        fontFamily: 'Yellowtail-Regular'
    }
});

export default SplashScreen;
