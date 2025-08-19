import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';


import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import SessionScreen from './src/screens/SessionScreen';
import NewSessionScreen from './src/screens/NewSessionScreen';

export type RootStackParamList = {
  Home: undefined;
  Camera: { sessionId: string };
  Review: { photoPath: string; sessionId: string };
  Session: { sessionId: string };
  NewSession: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // Initialize app
    console.log('App initialized');
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
          />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen}
          />
          <Stack.Screen 
            name="Review" 
            component={ReviewScreen}
          />
          <Stack.Screen 
            name="Session" 
            component={SessionScreen}
          />
          <Stack.Screen 
            name="NewSession" 
            component={NewSessionScreen}
          />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}