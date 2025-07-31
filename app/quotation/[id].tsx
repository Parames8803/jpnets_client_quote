import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { supabase } from '../../utils/supabaseClient';
import { Client, Quotation, Room, Measurement, Product } from '../../types/db';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function QuotationDetailsScreen() {
  const { id: quotationId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotationDetails = async () => {
      if (!quotationId) {
        Alert.alert('Error', 'Quotation ID is missing.');
        setLoading(false);
        return;
      }

      const id_str = Array.isArray(quotationId) ? quotationId[0] : quotationId;

      try {
        // Fetch quotation details
        const { data: quotationData, error: quotationError } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', id_str)
          .single();

        if (quotationError) {
          Alert.alert('Error fetching quotation', quotationError.message);
          setQuotation(null);
          setLoading(false);
          return;
        }
        setQuotation(quotationData);

        // Fetch client details
        if (quotationData?.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', quotationData.client_id)
            .single();

          if (clientError) {
            console.error('Error fetching client for quotation:', clientError.message);
            setClient(null);
          } else {
            setClient(clientData);
          }
        }

        // Define a type for the joined data structure
        type QuotationRoomJoin = {
          room_id: string;
          rooms: (Room & { measurements: Measurement[]; products: Product[]; }) | null;
        };

        // Fetch rooms associated with this quotation, along with their measurements and products
        const { data: quotationRoomsData, error: quotationRoomsError } = await supabase
          .from('quotation_rooms')
          .select(`
            room_id,
            rooms (
              *,
              measurements (*),
              products (*)
            )
          `)
          .eq('quotation_id', id_str) as { data: QuotationRoomJoin[] | null; error: any };

        if (quotationRoomsError) {
          console.error('Error fetching quotation rooms:', quotationRoomsError.message);
          setRooms([]);
        } else {
          const fetchedRooms = quotationRoomsData?.map(qr => qr.rooms).filter((room): room is Room & { measurements: Measurement[]; products: Product[]; } => room !== null) || [];
          setRooms(fetchedRooms);
        }

      } catch (error: any) {
        Alert.alert('An unexpected error occurred', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotationDetails();
  }, [quotationId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <Text style={styles.loadingText}>Loading quotation details...</Text>
      </View>
    );
  }

  if (!quotation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Quotation not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Quotation Details</Text>

      {/* Client Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        <Text style={styles.label}>Name: <Text style={styles.text}>{client?.name || 'N/A'}</Text></Text>
        <Text style={styles.label}>Contact: <Text style={styles.text}>{client?.contact_number || 'N/A'}</Text></Text>
        <Text style={styles.label}>Email: <Text style={styles.text}>{client?.email || 'N/A'}</Text></Text>
        <Text style={styles.label}>Address: <Text style={styles.text}>{client?.address || 'N/A'}</Text></Text>
      </View>

      {/* Quotation Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quotation Information</Text>
        <Text style={styles.label}>Quotation ID: <Text style={styles.text}>{quotation.id}</Text></Text>
        <Text style={styles.label}>Assigned Employee Phone: <Text style={styles.text}>{quotation.assigned_employee_phone || 'N/A'}</Text></Text>
        <Text style={styles.label}>Total Price: <Text style={styles.text}>${quotation.total_price?.toFixed(2) || 'N/A'}</Text></Text>
        <Text style={styles.label}>Created At: <Text style={styles.text}>{new Date(quotation.created_at).toLocaleDateString()}</Text></Text>
        {quotation.pdf_url && <Text style={styles.label}>PDF: <Text style={styles.linkText}>{quotation.pdf_url}</Text></Text>}
        {quotation.excel_url && <Text style={styles.label}>Excel: <Text style={styles.linkText}>{quotation.excel_url}</Text></Text>}
      </View>

      {/* Room Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Room Details ({rooms.length})</Text>
        {rooms.length > 0 ? (
          rooms.map((room, index) => (
            <View key={room.id} style={styles.roomItem}>
              <Text style={styles.roomItemTitle}>{room.room_type || 'Unnamed Room'}</Text>
              <Text style={styles.roomItemDescription}>{room.description || 'No description'}</Text>

              {/* Measurements for this room */}
              {(room as any).measurements && (room as any).measurements.length > 0 && (
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>Measurements:</Text>
                  {(room as any).measurements.map((m: Measurement) => (
                    <Text key={m.id} style={styles.subText}>
                      - {m.label}: {m.value} {m.unit_type} ({m.converted_sq_ft ? `${m.converted_sq_ft} sq.ft` : 'N/A'})
                    </Text>
                  ))}
                </View>
              )}

              {/* Products for this room */}
              {(room as any).products && (room as any).products.length > 0 && (
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>Products:</Text>
                  {(room as any).products.map((p: Product) => (
                    <Text key={p.id} style={styles.subText}>
                      - {p.name}: {p.quantity} {p.unit_type}
                    </Text>
                  ))}
                </View>
              )}

              {/* Reference Images */}
              {room.ref_image_urls && room.ref_image_urls.length > 0 && (
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>Reference Images:</Text>
                  {room.ref_image_urls.map((url, imgIndex) => (
                    <Text key={imgIndex} style={styles.linkText}>{url}</Text>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No rooms associated with this quotation.</Text>
        )}
      </View>

      {/* Quotation Summary (Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quotation Summary</Text>
        <Text style={styles.text}>
          This section will contain a summary of the quotation, including total calculated costs,
          discounts, and final payable amount.
        </Text>
        {/* Add more summary details here */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f7',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
    color: '#555',
  },
  text: {
    fontSize: 16,
    color: '#777',
  },
  linkText: {
    fontSize: 16,
    color: Colors.light.tint,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  roomItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  roomItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 5,
  },
  roomItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  subSection: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  subText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 2,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
