import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WalletInit from './screens/WalletInit';
import MainPage from './screens/MainPage';
import SplashScreen from './screens/SplashScreen';
import ShowPass from './screens/ShowPass';
import SwapScreen from './screens/SwapScreen';
import SendTransactionScreen from './screens/SendTransactionScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import WalletOptions from './screens/WalletOptions';
import ShowPrivateKey from './screens/ShowPrivateKey';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SplashScreen" screenOptions={{headerShown: false}}>
        <Stack.Screen name="SplashScreen" component={SplashScreen} />
        <Stack.Screen name="WalletInit" component={WalletInit} />
        <Stack.Screen name="ShowPass" component={ShowPass} />
        <Stack.Screen name="MainPage" component={MainPage} />
        <Stack.Screen name="SendTransactionScreen" component={SendTransactionScreen} />
        <Stack.Screen name="SwapScreen" component={SwapScreen} />
        <Stack.Screen name="ReceiveScreen" component={ReceiveScreen} />
        <Stack.Screen name="WalletOptions" component={WalletOptions} />
        <Stack.Screen name="ShowPrivateKey" component={ShowPrivateKey} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
