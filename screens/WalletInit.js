import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ActivityIndicator, Keyboard, StatusBar } from 'react-native';
import { createWallet, importWalletFromSeed, loadWallet, storeWallets } from '../components/walletUtils';
import { useNavigation } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';

const WalletInit = () => {
    const [mnemonicWords, setMnemonicWords] = useState(Array(12).fill(''));
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [goingToImport, setGoingToImport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigation = useNavigation();

    const handleCreateWallet = async () => {
        setIsModalVisible(true);
        setIsLoading(true);

        setTimeout(async () => {
            try {
                const newWallet = await createWallet();
                const wallets = await loadWallet();
                const updatedWallets = [...(wallets || []), { name: `Wallet ${wallets?.length + 1 || 1}`, ...newWallet }];

                await storeWallets(updatedWallets);
                await EncryptedStorage.setItem('activeWalletIndex', JSON.stringify(updatedWallets?.length - 1))
                setIsModalVisible(false);
                setIsLoading(false);
                navigation.replace('ShowPass', { walletData: newWallet });
            } catch (error) {
                console.error('Error creating wallet:', error);
                Alert.alert('Error', 'Failed to create wallet. Please try again.');
                setIsLoading(false);
            }
        }, 200);
    };

    const handleInputChange = (index, value) => {
        const updatedWords = [...mnemonicWords];
        updatedWords[index] = value.trim();
        setMnemonicWords(updatedWords);
    };

    const handleImportWallet = async () => {
        Keyboard.dismiss();
        const mnemonic = mnemonicWords.join(' ').trim();

        if (!mnemonic) {
            Alert.alert('Error', 'Please enter a valid seed phrase');
            return;
        }

        setIsLoading(true);
        setTimeout(async () => {
            try {
                const importedWallet = await importWalletFromSeed(mnemonic);
                const wallets = await loadWallet();
                const updatedWallets = [...(wallets || []), { name: `Wallet ${wallets?.length + 1 || 1}`, ...importedWallet }];

                await storeWallets(updatedWallets);
                await EncryptedStorage.setItem('activeWalletIndex', JSON.stringify(updatedWallets?.length - 1))
                setIsLoading(false);
                setIsModalVisible(false);
                navigation.replace('ShowPass', { walletData: importedWallet });
            } catch (error) {
                console.error('Error importing wallet:', error);
                Alert.alert('Error', 'Invalid seed phrase');
                setIsLoading(false);
            }
        }, 200);
    };

    const handleAlreadyWallet = () => {
        setGoingToImport(true);
        setIsModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={"#1b1b1b"} />
            <Text style={styles.title}>Enigma Wallet</Text>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={handleCreateWallet}>
                    <Text style={styles.buttonText}>Create a New Wallet</Text>
                </TouchableOpacity>
                <Text style={styles.orText}>OR</Text>
                <TouchableOpacity style={styles.button} onPress={handleAlreadyWallet}>
                    <Text style={styles.buttonText}>I Already Have a Wallet</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={isModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#deff89" />
                                <Text style={styles.loadingText}>Setting Up Your Wallet...</Text>
                            </View>
                        ) : goingToImport && (
                            <View>
                                <Text style={styles.modalTitle}>Import Wallet</Text>
                                <Text style={styles.modalSubtitle}>Enter your 12-word seed phrase</Text>
                                <View style={styles.grid}>
                                    {mnemonicWords.map((word, index) => (
                                        <TextInput
                                            key={index}
                                            style={styles.wordInput}
                                            placeholder={`${index + 1}`}
                                            value={word}
                                            onChangeText={(value) => handleInputChange(index, value)}
                                            autoCapitalize="none"
                                            placeholderTextColor={'gray'}
                                        />
                                    ))}
                                </View>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity style={styles.importButton} onPress={handleImportWallet}>
                                        <Text style={styles.importButtonText}>Import</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b1b1b',
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 46,
        fontFamily: 'Yellowtail-Regular',
        color: '#ffffff',
        marginBottom: 40,
        textAlign: 'center',
    },
    buttonContainer: {
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#b7d470',
        padding: 15,
        borderRadius: 25,
        width: '100%',
        marginBottom: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#1b1b1b',
        fontSize: 16,
        fontFamily: 'Inter_28pt-Bold',
    },
    orText: {
        color: '#e5e5e5',
        marginTop: 10,
        marginBottom: 20,
        fontFamily: 'Inter_28pt-Medium',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContainer: {
        backgroundColor: '#2c2c2c',
        padding: 20,
        borderRadius: 12,
        width: '90%',
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Inter_28pt-Bold',
        color: '#b7d470',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#e5e5e5',
        marginBottom: 20,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    wordInput: {
        width: '30%',
        height: 42,
        margin: 5,
        padding: 10,
        backgroundColor: '#393939',
        color: '#ffffff',
        borderRadius: 5,
        textAlign: 'center',
    },
    modalButtons: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    importButton: {
        backgroundColor: '#b7d470',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        flex: 1,
        marginRight: 5,
    },
    importButtonText: {
        color: '#1b1b1b',
        fontSize: 16,
        fontFamily: 'Inter_28pt-Bold',
    },
    cancelButton: {
        backgroundColor: '#393939',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        flex: 1,
        marginLeft: 5,
    },
    cancelButtonText: {
        color: '#e5e5e5',
        fontSize: 16,
        fontFamily: 'Inter_28pt-Bold',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: '#e5e5e5',
        fontFamily: 'Inter_28pt-SemiBold',
    },
});

export default WalletInit;
