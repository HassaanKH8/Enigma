import 'react-native-get-random-values';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import { Buffer } from 'buffer';
import analytics from '@react-native-firebase/analytics';

analytics().setAnalyticsCollectionEnabled(true);
analytics().logEvent('app_open');
global.Buffer = Buffer;
AppRegistry.registerComponent(appName, () => App);
