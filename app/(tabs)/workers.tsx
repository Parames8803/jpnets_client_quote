import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Quotation, Worker } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WorkersScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workers' | 'quotations'>('workers');

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
      .select('*, clients(name)')
      .is('assigned_worker_id', null)
      .in('status', ['Closed']);

    if (error) {
      Alert.alert('Error fetching quotations', error.message);
    } else {
      setQuotations(data || []);
    }
    setLoading(false);
  };

  const createWorker = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

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
      const { data, error } = await supabase
        .from('workers')
        .insert([
          { user_id: authData.user.id, name, email }
        ]);

      if (error) {
        Alert.alert('Error creating worker profile', error.message);
        await supabase.auth.admin.deleteUser(authData.user.id);
        setLoading(false);
        return;
      } else {
        Alert.alert('Success', 'Worker created successfully!');
        setName('');
        setEmail('');
        setPassword('');
        setIsCreateModalVisible(false);
        fetchWorkers();
      }

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
      }

      const { data: { user: restoredUser }, error: getRestoredUserError } = await supabase.auth.getUser();
      if (getRestoredUserError || !restoredUser || restoredUser.id !== originalUser.id) {
        console.error("Session not restored to original user:", restoredUser);
        Alert.alert('Session Verification Error', 'Original admin session could not be verified. Please re-login.');
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
      .update({ assigned_worker_id: selectedWorkerId })
      .eq('id', selectedQuotation.id);

    if (error) {
      Alert.alert('Error assigning quotation', error.message);
    } else {
      Alert.alert('Success', 'Quotation assigned successfully!');
      setIsAssignModalVisible(false);
      setSelectedQuotation(null);
      setSelectedWorkerId(null);
      fetchQuotations();
    }
    setLoading(false);
  };

  const renderWorkerCard = ({ item }: { item: Worker }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <IconSymbol name="person.circle.fill" size={40} color="#4A90E2" />
        </View>
        <View style={styles.cardHeaderText}>
          <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
          <ThemedText style={styles.cardSubtitle}>{item.email}</ThemedText>
        </View>
        <View style={styles.statusBadge}>
          <ThemedText style={styles.statusText}>Active</ThemedText>
        </View>
      </View>
    </View>
  );

  const renderQuotationCard = ({ item }: { item: Quotation }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.quotationHeader}>
          <View style={styles.quotationIconContainer}>
            <IconSymbol name="doc.text" size={32} color="#FF6B6B" />
          </View>
          <View style={styles.quotationDetails}>
            <ThemedText style={styles.quotationId}>#{item.id.slice(0, 8)}</ThemedText>
            <ThemedText style={styles.clientName}>{item.clients?.name || 'N/A'}</ThemedText>
          </View>
        </View>
        
        <View style={styles.quotationInfo}>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Amount</ThemedText>
            <ThemedText style={styles.infoValue}>${item.total_price?.toFixed(2) || '0.00'}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Status</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? '#4CAF50' : '#FFA726' }]}>
              <ThemedText style={styles.statusText}>{item.status || 'N/A'}</ThemedText>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.assignButton}
          onPress={() => {
            setSelectedQuotation(item);
            setIsAssignModalVisible(true);
          }}
        >
          <IconSymbol name="person.crop.circle.badge.plus" size={20} color="white" />
          <ThemedText style={styles.assignButtonText}>Assign Worker</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
      
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Workforce Manager</ThemedText>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <IconSymbol name="plus.circle.fill" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'workers' && styles.activeTab]}
          onPress={() => setActiveTab('workers')}
        >
          <IconSymbol name="person.2" size={20} color={activeTab === 'workers' ? '#4A90E2' : '#666'} />
          <ThemedText style={[styles.tabText, activeTab === 'workers' && styles.activeTabText]}>
            Workers ({workers.length})
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'quotations' && styles.activeTab]}
          onPress={() => setActiveTab('quotations')}
        >
          <IconSymbol name="doc.text" size={20} color={activeTab === 'quotations' ? '#4A90E2' : '#666'} />
          <ThemedText style={[styles.tabText, activeTab === 'quotations' && styles.activeTabText]}>
            Quotations ({quotations.length})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <ThemedText style={styles.loadingText}>Loading...</ThemedText>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {activeTab === 'workers' && (
              <FlatList
                data={workers}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkerCard}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={fetchWorkers}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <IconSymbol 
                      name="person.3" 
                      size={64} 
                      color="#ccc" 
                    />
                    <ThemedText style={styles.emptyText}>
                      No workers found
                    </ThemedText>
                  </View>
                }
              />
            )}
            {activeTab === 'quotations' && (
              <FlatList
                data={quotations}
                keyExtractor={(item) => item.id}
                renderItem={renderQuotationCard}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={fetchQuotations}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <IconSymbol 
                      name="doc.text" 
                      size={64} 
                      color="#ccc" 
                    />
                    <ThemedText style={styles.emptyText}>
                      No unassigned quotations found
                    </ThemedText>
                  </View>
                }
              />
            )}
          </View>
        )}
      </View>

      {/* Create Worker Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create New Worker</ThemedText>
              <TouchableOpacity 
                onPress={() => setIsCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter worker's full name"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Email Address</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter worker's email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Password</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity 
                style={[styles.modalButton, styles.createWorkerButton]}
                onPress={createWorker}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <IconSymbol name="plus" size={20} color="white" />
                    <ThemedText style={styles.modalButtonText}>Create Worker</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assign Worker Modal */}
      <Modal
        visible={isAssignModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Assign Quotation</ThemedText>
              <TouchableOpacity 
                onPress={() => setIsAssignModalVisible(false)}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {selectedQuotation && (
                <View style={styles.quotationSummary}>
                  <ThemedText style={styles.summaryTitle}>Quotation Details</ThemedText>
                  <ThemedText style={styles.summaryText}>ID: #{selectedQuotation.id.slice(0, 8)}</ThemedText>
                  <ThemedText style={styles.summaryText}>Client: {selectedQuotation.clients?.name || 'N/A'}</ThemedText>
                  <ThemedText style={styles.summaryText}>Amount: ${selectedQuotation.total_price?.toFixed(2) || '0.00'}</ThemedText>
                </View>
              )}

              <ThemedText style={styles.sectionTitle}>Select Worker</ThemedText>
              
              {workers.map((worker) => (
                <TouchableOpacity
                  key={worker.id}
                  style={[
                    styles.workerOption,
                    selectedWorkerId === worker.id && styles.selectedWorkerOption,
                  ]}
                  onPress={() => setSelectedWorkerId(worker.id)}
                >
                  <View style={styles.workerOptionContent}>
                    <IconSymbol name="person.circle" size={32} color="#4A90E2" />
                    <View style={styles.workerOptionText}>
                      <ThemedText style={styles.workerOptionName}>{worker.name}</ThemedText>
                      <ThemedText style={styles.workerOptionEmail}>{worker.email}</ThemedText>
                    </View>
                    {selectedWorkerId === worker.id && (
                      <IconSymbol name="checkmark.circle.fill" size={24} color="#4CAF50" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.assignQuotationButton]}
                  onPress={assignQuotation}
                  disabled={loading || !selectedWorkerId}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <IconSymbol name="arrow.right.circle" size={20} color="white" />
                      <ThemedText style={styles.modalButtonText}>Assign</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsAssignModalVisible(false);
                    setSelectedWorkerId(null);
                  }}
                >
                  <ThemedText style={[styles.modalButtonText, { color: '#666' }]}>Cancel</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1A1A2E',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  createButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F0F8FF',
  },
  tabText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    marginRight: 15,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 20,
  },
  quotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quotationIconContainer: {
    marginRight: 15,
  },
  quotationDetails: {
    flex: 1,
  },
  quotationId: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    color: '#666',
  },
  quotationInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  createWorkerButton: {
    backgroundColor: '#4A90E2',
    marginTop: 20,
  },
  assignQuotationButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quotationSummary: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#4A90E2',
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  workerOption: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  selectedWorkerOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FFF4',
  },
  workerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  workerOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  workerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workerOptionEmail: {
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    marginTop: 20,
  },
});
