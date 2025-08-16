import * as FileSystem from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabaseClient';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { Client } from '../../types/db';

const { width } = Dimensions.get('window');

export default function ClientsScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await fetchClients(userId);
    }
    setRefreshing(false);
  }, [userId]);

  const fetchClients = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('created_by', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', 'Failed to fetch clients: ' + error.message);
      } else {
        setClients(data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', 'An unexpected error occurred while fetching clients: ' + error.message);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    Alert.alert(
      "Delete Client",
      "Are you sure you want to delete this client? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

              if (error) {
                Alert.alert('Error', 'Failed to delete client: ' + error.message);
              } else {
                setClients(clients.filter((client) => client.id !== clientId));
                Alert.alert('Success', 'Client deleted successfully.');
              }
            } catch (error: any) {
              Alert.alert('Error', 'An unexpected error occurred: ' + error.message);
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    const checkUserAndFetchClients = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setUserId(user.id);
        fetchClients(user.id);
      } else {
        router.replace('/(auth)/login');
      }
    };

    checkUserAndFetchClients();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login');
      } else if (session.user) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
        fetchClients(session.user.id);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchClients(userId);
      }
    }, [userId])
  );

  if (userEmail === undefined || userId === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading...</Text>
      </View>
    );
  }

  const handleCreateNewClient = () => {
    router.push('/create-client');
  };

  const handleExportClients = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setRefreshing(true);
    try {
      const { data: clientsToExport, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('created_by', userId);

      if (clientsError) {
        throw clientsError;
      }

      if (!clientsToExport || clientsToExport.length === 0) {
        Alert.alert('No Clients', 'There are no clients to export.');
        return;
      }

      let allClientData: any[] = [];

      for (const client of clientsToExport) {
        const { data: fullClientData, error: fullDataError } = await supabase.rpc('get_client_full_data', { p_client_id: client.id });

        if (fullDataError) {
          console.error(`Error fetching full data for client ${client.id}:`, fullDataError);
          continue;
        }

        if (fullClientData && fullClientData.length > 0) {
          // Group data by client, then by room, then by quotation
          const groupedData = fullClientData.reduce((acc: any, row: any) => {
            // Client level
            if (!acc.client) {
              acc.client = {
                'Client ID': row.client_id,
                'Client Name': row.client_name,
                'Client Contact Number': row.client_contact_number,
                'Client Email': row.client_email,
                'Client Address': row.client_address,
                'Client Latitude': row.client_latitude,
                'Client Longitude': row.client_longitude,
                'Client Created At': row.client_created_at,
                Rooms: {},
                Quotations: {},
              };
            }

            // Room level
            if (row.room_id && !acc.client.Rooms[row.room_id]) {
              acc.client.Rooms[row.room_id] = {
                'Room ID': row.room_id,
                'Room Type': row.room_type,
                'Room Description': row.room_description,
                'Room Status': row.room_status,
                'Room Total Sq Ft': row.room_total_sq_ft,
                'Room Created At': row.room_created_at,
                Products: {},
                Measurements: {},
              };
              if (row.room_ref_image_urls) {
                row.room_ref_image_urls.forEach((url: string, index: number) => {
                  const publicURL = supabase.storage.from('file-storage').getPublicUrl(url).data.publicUrl;
                  acc.client.Rooms[row.room_id][`Room Image URL ${index + 1}`] = decodeURIComponent(publicURL).replace(/"/g, '');
                });
              }
            }

            // Product level
            if (row.product_id && row.room_id && !acc.client.Rooms[row.room_id].Products[row.product_id]) {
              acc.client.Rooms[row.room_id].Products[row.product_id] = {
                'Product ID': row.product_id,
                'Product Name': row.product_name,
                'Product Category': row.product_category,
                'Product Subcategory': row.product_subcategory,
                'Product Quantity': row.product_quantity,
                'Product Unit Type': row.product_unit_type,
                'Product Price': row.product_price,
                'Product Default Price': row.product_default_price,
                'Product Wages': row.product_wages,
                'Product Default Wages': row.product_default_wages,
                'Product Description': row.product_description,
                'Product Created At': row.product_created_at,
              };
            }

            // Measurement level
            if (row.measurement_id && row.room_id && !acc.client.Rooms[row.room_id].Measurements[row.measurement_id]) {
              acc.client.Rooms[row.room_id].Measurements[row.measurement_id] = {
                'Measurement ID': row.measurement_id,
                'Measurement Length Unit Type': row.measurement_length_unit_type,
                'Measurement Length Value': row.measurement_length_value,
                'Measurement Width Unit Type': row.measurement_width_unit_type,
                'Measurement Width Value': row.measurement_width_value,
                'Measurement Converted Sq Ft': row.measurement_converted_sq_ft,
                'Measurement Created At': row.measurement_created_at,
              };
            }

            // Quotation level
            if (row.quotation_id && !acc.client.Quotations[row.quotation_id]) {
              acc.client.Quotations[row.quotation_id] = {
                'Quotation ID': row.quotation_id,
                'Quotation Total Price': row.quotation_total_price,
                'Quotation PDF URL': row.quotation_pdf_url,
                'Quotation Excel URL': row.quotation_excel_url,
                'Quotation Assigned Worker ID': row.quotation_assigned_worker_id,
                'Quotation Status': row.quotation_status,
                'Quotation Created At': row.quotation_created_at,
              };
            }

            return acc;
          }, {});

          // Flatten the grouped data into a single row for the Excel sheet
          const flattenedClientData: any = { ...groupedData.client };
          delete flattenedClientData.Rooms;
          delete flattenedClientData.Quotations;

          let roomIndex = 1;
          for (const roomId in groupedData.client.Rooms) {
            const room = groupedData.client.Rooms[roomId];
            const roomPrefix = `Room ${roomIndex} - `;
            for (const key in room) {
              if (key !== 'Products' && key !== 'Measurements' && key !== 'Room Image URLs') {
                flattenedClientData[roomPrefix + key] = room[key];
              }
            }
            if (room['Room Image URLs']) {
              const imageUrls = room['Room Image URLs'].split(', ');
              imageUrls.forEach((url: string, index: number) => {
                flattenedClientData[`${roomPrefix}Room Image URL ${index + 1}`] = url;
              });
            }

            let productIndex = 1;
            for (const productId in room.Products) {
              const product = room.Products[productId];
              const productPrefix = `${roomPrefix}Product ${productIndex} - `;
              for (const key in product) {
                flattenedClientData[productPrefix + key] = product[key];
              }
              productIndex++;
            }

            let measurementIndex = 1;
            for (const measurementId in room.Measurements) {
              const measurement = room.Measurements[measurementId];
              const measurementPrefix = `${roomPrefix}Measurement ${measurementIndex} - `;
              for (const key in measurement) {
                flattenedClientData[measurementPrefix + key] = measurement[key];
              }
              measurementIndex++;
            }
            roomIndex++;
          }

          let quotationIndex = 1;
          for (const quotationId in groupedData.client.Quotations) {
            const quotation = groupedData.client.Quotations[quotationId];
            const quotationPrefix = `Quotation ${quotationIndex} - `;
            for (const key in quotation) {
              flattenedClientData[quotationPrefix + key] = quotation[key];
            }
            quotationIndex++;
          }

          allClientData.push(flattenedClientData);
        }
      }

      if (allClientData.length === 0) {
        Alert.alert('No Data', 'No comprehensive client data found for export.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(allClientData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clients Data');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const filename = FileSystem.documentDirectory + 'ClientData.xlsx';
      await FileSystem.writeAsStringAsync(filename, wbout, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filename);
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on your device.');
      }

      Alert.alert('Export Successful', 'Client data exported to ClientData.xlsx');

    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to export client data.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={[
        styles.clientCard,
        { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
        { borderColor: isDark ? Colors.dark.border : Colors.light.border },
      ]}
      onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.clientHeader}>
        <View style={[styles.clientAvatar, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }]}>
          <Text style={[styles.avatarText, { color: isDark ? "black" : "white" }]}>
            {item.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.name}</Text>
          <Text style={[styles.clientEmail, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{item.email}</Text>
        </View>
        <View style={styles.clientActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]}
            onPress={(e) => {
              e.stopPropagation();
              router.push({ pathname: '/edit-client', params: { id: item.id } });
            }}
          >
            <IconSymbol size={18} name="pencil" color={isDark ? Colors.dark.primary : Colors.light.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteClient(item.id);
            }}
          >
            <IconSymbol size={18} name="trash.fill" color={isDark ? Colors.dark.error : Colors.light.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.clientDetails}>
        <Text style={[styles.clientPhone, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.contact_number}</Text>
        <Text style={[styles.clientAddress, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]} numberOfLines={2}>{item.address}</Text>
        <Text style={[styles.clientDate, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Added {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
            onPress={handleExportClients}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="square.and.arrow.up.fill" color={isDark ? Colors.dark.text : Colors.light.text} />
            <Text style={[styles.exportButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
            onPress={handleCreateNewClient}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="plus.circle.fill" color={isDark ? Colors.dark.text : Colors.light.text} />
            <Text style={[styles.exportButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Add Client</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.clientsSection}>
          {clients.length > 0 ? (
            <FlatList
              data={clients}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
                <IconSymbol size={48} name="person.crop.circle.badge.plus" color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>No clients yet</Text>
              <Text style={[styles.emptyMessage, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
                Start building your client base by adding your first client
              </Text>
              <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }]}
                onPress={handleCreateNewClient}
              >
                <Text style={[styles.emptyActionText, { color: isDark ? "black" : "white" }]}>Add Your First Client</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addClientButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 10,
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  clientsSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  clientCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientDetails: {
    gap: 4,
    marginTop: 8,
  },
  clientPhone: {
    fontSize: 15,
    fontWeight: '500',
  },
  clientAddress: {
    fontSize: 14,
    lineHeight: 20,
  },
  clientDate: {
    fontSize: 12,
    marginTop: 8,
  },
  separator: {
    height: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyAction: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
