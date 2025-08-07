import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Quotation } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Dimensions, FlatList, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { StatusUpdateModal } from '@/components/ui/StatusUpdateModal';

const { width } = Dimensions.get('window');

export default function WorkerDashboardScreen() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedQuotationForStatus, setSelectedQuotationForStatus] = useState<Quotation | null>(null);
  const [newQuotationStatus, setNewQuotationStatus] = useState<string>('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const getWorkerId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (workerError) {
          Alert.alert('Error', workerError.message);
        } else if (workerData) {
          setWorkerId(workerData.id);
        }
      }
    };
    getWorkerId();
  }, []);

  useEffect(() => {
    if (workerId) {
      fetchAssignedQuotations();
    }
  }, [workerId]);

  const fetchAssignedQuotations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quotations')
      .select('*, clients(*), quotation_rooms!left(rooms!left(*, products!left(*)))')
      .eq('assigned_worker_id', workerId);

    if (error) {
      Alert.alert('Error fetching assigned quotations', error.message);
    } else {
      setQuotations(data || []);
    }
    setLoading(false);
  };

  const updateQuotationStatus = async (quotationId: string, newStatus: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('quotations')
      .update({ status: newStatus })
      .eq('id', quotationId);

    if (error) {
      Alert.alert('Error updating status', error.message);
    } else {
      Alert.alert('Success', `Quotation status updated to ${newStatus}`);
      fetchAssignedQuotations(); // Refresh the list
    }
    setLoading(false);
  };

  const handleStatusUpdatePress = (quotation: Quotation) => {
    setSelectedQuotationForStatus(quotation);
    setIsStatusModalVisible(true);
  };

  const handleModalStatusSelect = (newStatus: string) => {
    if (selectedQuotationForStatus) {
      updateQuotationStatus(selectedQuotationForStatus.id, newStatus);
      setIsStatusModalVisible(false);
      setSelectedQuotationForStatus(null);
    }
  };

  const renderQuotationItem = ({ item }: { item: Quotation }) => (
    <View style={[styles.quotationItem, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
      <ThemedText style={styles.quotationText}>Quotation ID: {item.id}</ThemedText>
      <ThemedText style={styles.quotationText}>Client: {item.clients?.name || 'N/A'}</ThemedText>
      {item.clients?.address && (
        <ThemedText style={styles.quotationText}>Address: {item.clients.address}</ThemedText>
      )}
      {item.clients?.latitude != null && item.clients?.longitude != null && (
                        <TouchableOpacity 
                          style={[styles.coordinatesCard, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' }]}
                          onPress={() => {
                            const url = Platform.select({
                              ios: `maps:0,0?q=${item.clients?.latitude},${item.clients?.longitude}`,
                              android: `geo:0,0?q=${item.clients?.latitude},${item.clients?.longitude}`,
                            });
                            if (url) {
                              Linking.openURL(url);
                            } else {
                              Alert.alert('Error', 'Could not open map application.');
                            }
                          }} 
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.coordinatesLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                            📌 Coordinates
                          </Text>
                          <Text style={[styles.coordinatesText, { color: isDark ? '#22C55E' : '#16A34A' }]}>
                            Lat: {item.clients?.latitude.toFixed(4)}, Lon: {item.clients?.longitude.toFixed(4)}
                          </Text>
                          <Text style={[styles.coordinatesHint, { color: isDark ? Colors.dark.placeholder : Colors.light.placeholder }]}>
                            Tap to open in maps
                          </Text>
                        </TouchableOpacity>
                      )}
      <ThemedText style={styles.quotationText}>Total Price: ${item.total_price?.toFixed(2) || '0.00'}</ThemedText>
      <ThemedText style={styles.quotationText}>Status: {item.status || 'N/A'}</ThemedText>

      {item.quotation_rooms && item.quotation_rooms.length > 0 && (
        <View style={styles.productsSection}>
          <ThemedText style={styles.productsTitle}>Products:</ThemedText>
          {item.quotation_rooms.map((qr, qrIndex) => (
            <View key={qrIndex}>
              {qr.rooms?.products && qr.rooms.products.length > 0 && qr.rooms.products.map((product, productIndex) => (
                <ThemedText key={productIndex} style={styles.productItem}>
                  - {product.name || 'Unnamed Product'}: Wages ${product.wages?.toFixed(2) || '0.00'}
                </ThemedText>
              ))}
            </View>
          ))}
        </View>
      )}

      <View style={styles.statusButtons}>
        <TouchableOpacity 
          style={[styles.statusButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]} 
          onPress={() => handleStatusUpdatePress(item)}
        >
          <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={isDark ? Colors.dark.primary : Colors.light.primary} />
          <Text style={[styles.statusButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Update Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? Colors.dark.background : Colors.light.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchAssignedQuotations}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.title}>Your Assigned Quotations</ThemedText>
        {loading ? (
          <ThemedText style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading quotations...</ThemedText>
        ) : quotations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
              <IconSymbol size={48} name="house" color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
            </View>
            <ThemedText style={styles.emptyTitle}>No quotations assigned</ThemedText>
            <ThemedText style={styles.emptyMessage}>
              You currently have no quotations assigned to you.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={quotations}
            keyExtractor={(item) => item.id}
            renderItem={renderQuotationItem}
            scrollEnabled={false} // Disable FlatList's own scrolling as it's inside a ScrollView
          />
        )}
      </ScrollView>

      <StatusUpdateModal
        isVisible={isStatusModalVisible}
        onClose={() => setIsStatusModalVisible(false)}
        onSelectStatus={handleModalStatusSelect}
        currentStatus={selectedQuotationForStatus?.status || null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Add some padding to the bottom for better scroll experience
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  quotationItem: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quotationText: {
    fontSize: 16,
    marginBottom: 5,
  },
  productsSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productItem: {
    fontSize: 15,
    marginLeft: 10,
    marginBottom: 3,
  },
  statusButtons: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  statusButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  coordinatesCard: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  coordinatesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  coordinatesText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  coordinatesHint: {
    fontSize: 12,
    marginTop: 5,
  },
});
