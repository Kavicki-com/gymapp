import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, session } = useAuth();
    const router = useRouter();

    // If already logged in, redirect to dashboard
    React.useEffect(() => {
        if (session) {
            router.replace('/(tabs)');
        }
    }, [session]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }
        setLoading(true);
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            Alert.alert('Erro no Login', error.message);
        } else {
            // Router replace handled by useEffect on session change or here
            router.replace('/(tabs)');
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-gray-900 p-4">
            <Stack.Screen options={{ headerShown: false }} />
            <View className="flex-row items-center mb-8">
                {/* Dumbbell Icon replacement (using Text/FontAwesome for now or Image) */}
                <Text className="text-4xl font-bold text-white ml-2">WM Fitness</Text>
            </View>

            <View className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-xl">
                <Text className="text-2xl font-bold text-white text-center mb-6">Acesso do Administrador</Text>

                <View className="mb-4">
                    <Text className="text-gray-300 text-sm font-bold mb-2">Email</Text>
                    <TextInput
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white focus:border-yellow-500"
                        placeholder="admin@gym.com"
                        placeholderTextColor="#9ca3af"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-gray-300 text-sm font-bold mb-2">Senha</Text>
                    <TextInput
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white focus:border-yellow-500"
                        placeholder="admin123"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <Pressable
                    className={`w-full bg-yellow-500 py-3 rounded-lg items-center ${loading ? 'opacity-70' : ''}`}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#111827" />
                    ) : (
                        <Text className="text-gray-900 font-bold text-base">Entrar</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}
