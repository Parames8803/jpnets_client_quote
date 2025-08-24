import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PurchasedOrder, Vendor } from '@/types/db';
import { AntDesign } from '@expo/vector-icons';

interface OrderItemProps {
  item: PurchasedOrder;
  vendors: Vendor[];
  shareOrderViaWhatsApp: (order: PurchasedOrder) => Promise<void>;
}

const OrderItem: React.FC<OrderItemProps> = ({ item, vendors, shareOrderViaWhatsApp }) => {
  const vendor = vendors.find(v => v.id === item.vendor_id);

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>Order ID: {item.id.slice(-8)}</Text>
        <View style={styles.orderActions}>
          <Text style={styles.badge}>{new Date(item.created_at).toLocaleDateString()}</Text>
          <TouchableOpacity onPress={() => shareOrderViaWhatsApp(item)} style={styles.shareButton}>
            <AntDesign name="sharealt" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
      {vendor && (
        <Text style={styles.orderText}>Vendor: {vendor.name}</Text>
      )}
      <View style={styles.orderDetails}>
        <Text style={styles.orderDetailsTitle}>Materials:</Text>
        {item.raw_materials?.map((material, index) => (
          <Text key={index} style={styles.orderDetailsText}>
            - {material.name} ({material.order_quantity} {material.order_unit_type})
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  orderDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderDetailsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderDetailsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  shareButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default OrderItem;
