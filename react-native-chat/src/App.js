import { registerRootComponent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { MenuProvider } from 'react-native-popup-menu';
import React, { useState, useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Chat from './screens/Chat';
import Help from './screens/Help';
import Chats from './screens/Chats';
import Login from './screens/Login';
import Users from './screens/Users';
import About from './screens/About';
import Group from './screens/Group';
import SignUp from './screens/SignUp';
import Profile from './screens/Profile';
import Account from './screens/Account';
import VoiceSettings from './screens/VoiceSettings';
import { auth } from './config/firebase';
import Settings from './screens/Settings';
import ChatInfo from './screens/ChatInfo';
import PrivacyDemo from './screens/PrivacyDemo';
import { colors } from './config/constants';
import ChatMenu from './components/ChatMenu';
import ChatHeader from './components/ChatHeader';
import { UnreadMessagesContext, UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import {
  AuthenticatedUserContext,
  AuthenticatedUserProvider,
} from './contexts/AuthenticatedUserContext';
import { EncryptionProvider } from './contexts/EncryptionContext';
import { VoiceSettingsProvider } from './contexts/VoiceSettingsContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { unreadCount, setUnreadCount } = useContext(UnreadMessagesContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = route.name === 'Chats' ? 'chatbubbles' : 'settings';
          iconName += focused ? '' : '-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.backgroundSecondary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
        },
        presentation: 'modal',
      })}
    >
      <Tab.Screen 
        name="Chats" 
        options={{ 
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: colors.textInverse,
            fontSize: 11,
            fontWeight: '700',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
          },
        }}
      >
        {() => <Chats setUnreadCount={setUnreadCount} />}
      </Tab.Screen>
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
};

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: colors.backgroundSecondary,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
      },
      headerTintColor: colors.primary,
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen name="Home" component={TabNavigator} options={{ headerShown: false }} />
    <Stack.Screen
      name="Chat"
      component={Chat}
      options={({ route }) => ({
        headerTitle: () => <ChatHeader chatName={route.params.chatName} chatId={route.params.id} />,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
            <ChatMenu chatName={route.params.chatName} chatId={route.params.id} />
          </View>
        ),
      })}
    />
    <Stack.Screen 
      name="Users" 
      component={Users} 
      options={{ title: 'New Chat' }} 
    />
    <Stack.Screen 
      name="Profile" 
      component={Profile}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen 
      name="About" 
      component={About}
      options={{ title: 'About' }}
    />
    <Stack.Screen 
      name="Help" 
      component={Help}
      options={{ title: 'Help & Support' }}
    />
    <Stack.Screen 
      name="Account" 
      component={Account}
      options={{ title: 'Privacy & Account' }}
    />
    <Stack.Screen 
      name="VoiceSettings" 
      component={VoiceSettings}
      options={{ title: 'Voice Masking Settings' }}
    />
    <Stack.Screen 
      name="Group" 
      component={Group} 
      options={{ title: 'New Group' }} 
    />
    <Stack.Screen 
      name="ChatInfo" 
      component={ChatInfo} 
      options={{ title: 'Chat Info' }} 
    />
    <Stack.Screen 
      name="PrivacyDemo" 
      component={PrivacyDemo} 
      options={{ 
        title: 'Privacy Testing Lab',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTitleStyle: {
          color: colors.textInverse,
          fontSize: 18,
          fontWeight: '700',
        },
        headerTintColor: colors.textInverse,
      }} 
    />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="SignUp" component={SignUp} />
  </Stack.Navigator>
);

const RootNavigator = () => {
  const { user, setUser } = useContext(AuthenticatedUserContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
      setUser(authenticatedUser || null);
      setIsLoading(false);
    });

    return unsubscribeAuth;
  }, [setUser]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <NavigationContainer>{user ? <MainStack /> : <AuthStack />}</NavigationContainer>;
};

const App = () => (
  <MenuProvider>
    <AuthenticatedUserProvider>
      <UnreadMessagesProvider>
        <EncryptionProvider>
          <VoiceSettingsProvider>
            <RootNavigator />
          </VoiceSettingsProvider>
        </EncryptionProvider>
      </UnreadMessagesProvider>
    </AuthenticatedUserProvider>
  </MenuProvider>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default registerRootComponent(App);
