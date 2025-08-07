import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Quotation, Worker } from '@/types/db'; // Import Quotation and Worker interfaces
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function WorkersScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkers();
    fetchQuotations();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*');

    if (error) {
      Alert.alert('Error fetching workers', error.message);
    } else {
      setWorkers(data || []);
    }
    setLoading(false);
  };

  const fetchQuotations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quotations')
      .select('*, clients(name)') // Fetch client name along with quotation
      .is('assigned_worker_id', null) // Only fetch unassigned quotations
      .in('status', ['Active', 'Not Active']); // Fetch quotations that are active or not active and unassigned

    if (error) {
      Alert.alert('Error fetching quotations', error.message);
    } else {
      setQuotations(data || []);
    }
    setLoading(false);
  };

  const createWorker = async () => {
    setLoading(true);

    const { data: { user: originalUser }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError || !originalUser) {
      Alert.alert('Error', 'Admin user not found. Please login again.');
      setLoading(false);
      return;
    }

    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !currentSession) {
      console.error("Error getting current session or no current session:", sessionError);
      Alert.alert('Error', 'Could not retrieve current session. Please login again.');
      setLoading(false);
      return;
    }

    // Create auth.users entry
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'worker',
          name: name,
        },
      },
    });

    if (authError) {
      Alert.alert('Error creating user', authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Insert into workers table
      const { data, error } = await supabase
        .from('workers')
        .insert([
          { user_id: authData.user.id, name, email }
        ]);

      if (error) {
        Alert.alert('Error creating worker profile', error.message);
        // Optionally, delete the auth user if worker profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        setLoading(false);
        return;
      } else {
        Alert.alert('Success', 'Worker created successfully!');
        setName('');
        setEmail('');
        setPassword('');
        fetchWorkers(); // Refresh the list
      }

      // After successful signup, the new user is automatically logged in.
      // We need to sign out the newly created user and restore the original user's session.
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Error signing out new user:", signOutError);
        Alert.alert('Sign Out Error', 'Failed to sign out newly created worker.');
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      });

      if (setSessionError) {
        console.error("Error restoring session:", setSessionError);
        Alert.alert('Session Restore Error', 'Failed to restore original admin session. Please re-login.');
        // Depending on your app flow, you might want to redirect to login here
      }

      const { data: { user: restoredUser }, error: getRestoredUserError } = await supabase.auth.getUser();
      if (getRestoredUserError || !restoredUser || restoredUser.id !== originalUser.id) {
        console.error("Session not restored to original user:", restoredUser);
        Alert.alert('Session Verification Error', 'Original admin session could not be verified. Please re-login.');
        // Depending on your app flow, you might want to redirect to login here
      }
    }
    setLoading(false);
  };

  const assignQuotation = async () => {
    if (!selectedQuotation || !selectedWorkerId) {
      Alert.alert('Error', 'Please select a quotation and a worker.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('quotations')
      .update({ assigned_worker_id: selectedWorkerId, status: 'Assigned' })
      .eq('id', selectedQuotation.id);

    if (error) {
      Alert.alert('Error assigning quotation', error.message);
    } else {
      Alert.alert('Success', 'Quotation assigned successfully!');
      setIsAssignModalVisible(false);
      setSelectedQuotation(null);
      setSelectedWorkerId(null);
      fetchQuotations(); // Refresh the list of unassigned quotations
    }
    setLoading(false);
  };

  const renderWorkerItem = ({ item }: { item: Worker }) => (
    <View style={styles.workerItem}>
      <ThemedText style={styles.workerName}>{item.name}</ThemedText>
      <ThemedText style={styles.workerEmail}>{item.email}</ThemedText>
      {/* Removed the assign client button from here, will add a dedicated assign section */}
    </View>
  );

  const renderQuotationItem = ({ item }: { item: Quotation }) => (
    <View style={styles.quotationItem}>
      <ThemedText style={styles.quotationText}>Quotation ID: {item.id}</ThemedText>
      <ThemedText style={styles.quotationText}>Client: {item.clients?.name || 'N/A'}</ThemedText>
      <ThemedText style={styles.quotationText}>Total Price: ${item.total_price?.toFixed(2) || '0.00'}</ThemedText>
      <ThemedText style={styles.quotationText}>Status: {item.status || 'N/A'}</ThemedText>
      <TouchableOpacity 
        onPress={() => {
          setSelectedQuotation(item);
          setIsAssignModalVisible(true);
        }}
      >
        <IconSymbol name="person.crop.circle.badge.plus" size={24} color="green" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Create New Worker</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? "Creating..." : "Create Worker"} onPress={createWorker} disabled={loading} />

      <ThemedText style={styles.title}>Existing Workers</ThemedText>
      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkerItem}
        refreshing={loading}
        onRefresh={fetchWorkers}
      />

      <ThemedText style={styles.title}>Unassigned Quotations</ThemedText>
      <FlatList
        data={quotations}
        keyExtractor={(item) => item.id}
        renderItem={renderQuotationItem}
        refreshing={loading}
        onRefresh={fetchQuotations}
      />

      {isAssignModalVisible && selectedQuotation && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Assign Quotation to Worker</ThemedText>
            <ThemedText>Quotation ID: {selectedQuotation.id}</ThemedText>
            <ThemedText>Client: {selectedQuotation.clients?.name || 'N/A'}</ThemedText>
            <ThemedText>Select Worker:</ThemedText>
            <FlatList
              data={workers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.workerOption,
                    selectedWorkerId === item.id && styles.selectedWorkerOption,
                  ]}
                  onPress={() => setSelectedWorkerId(item.id)}
                >
                  <ThemedText>{item.name}</ThemedText>
                </TouchableOpacity>
              )}
            />
            <Button title="Assign" onPress={assignQuotation} disabled={loading} />
            <Button title="Cancel" onPress={() => setIsAssignModalVisible(false)} color="red" />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  workerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  workerEmail: {
    fontSize: 16,
    color: '#666',
  },
  quotationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
  quotationText: {
    fontSize: 16,
    marginBottom: 5,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  workerOption: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 5,
  },
  selectedWorkerOption: {
    backgroundColor: '#e0e0e0',
  },
});
