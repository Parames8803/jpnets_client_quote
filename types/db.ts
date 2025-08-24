// Interface for the 'clients' table
export interface Client {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  user_id: string; // uuid (references auth.users.id)
  created_by: string; // uuid (references auth.users.id - the admin who created this client)
  name: string; // text
  contact_number: string | null; // text, nullable
  email: string | null; // text, nullable
  address: string | null; // text, nullable
  latitude: number | null; // numeric, nullable
  longitude: number | null; // numeric, nullable
  pending_amount?: number | null; // numeric, nullable, added for convenience
}

// Interface for the 'measurements' table
export interface Measurement {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  room_id: string | null; // uuid, nullable (references rooms.id)
  length_unit_type: string | null; // text, nullable
  length_value: number | null; // numeric, nullable
  width_unit_type: string | null; // text, nullable
  width_value: number | null; // numeric, nullable
  converted_sq_ft: number | null; // numeric, nullable
}

// Interface for the 'products' table
export interface Product {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  room_id: string | null; // uuid, nullable (references rooms.id)
  name: string | null; // text, nullable (e.g., {room_type} {product_category} {product_subcategory})
  product_category: string | null; // text, nullable
  product_subcategory: string | null; // text, nullable
  quantity: number | null; // numeric, nullable
  unit_type: string | null; // text, nullable
  price: number | null; // numeric, nullable
  default_price: number | null; // numeric, nullable
  wages: number | null; // numeric, nullable
  default_wages: number | null; // numeric, nullable
  description: string | null; // text, nullable
  length_value: number | null; // numeric, nullable, for products with sq.ft unit type
  length_unit_type: string | null; // text, nullable, for products with sq.ft unit type
  width_value: number | null; // numeric, nullable, for products with sq.ft unit type
  width_unit_type: string | null; // text, nullable, for products with sq.ft unit type
}

// Interface for the 'quotation_rooms' table (junction table)
export interface QuotationRoom {
  created_at: string; // timestamp with time zone
  quotation_id: string; // uuid (references quotations.id)
  room_id: string; // uuid (references rooms.id)
  room_total_price: number | null; // numeric, nullable
}

// Interface for the 'quotations' table
export interface Quotation {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  quote_id: string; // text, unique identifier for the quotation (e.g., JP001)
  client_id: string | null; // uuid, nullable (references clients.id)
  total_price: number | null; // numeric, nullable
  pdf_url: string | null; // text, nullable
  excel_url: string | null; // text, nullable
  invoice_generated: boolean | null; // boolean, indicates if an invoice has been generated for this quotation
  assigned_worker_id: string | null; // uuid, nullable (references workers.id)
  status: string | null; // text, nullable (e.g., 'Pending', 'Assigned', 'In Progress', 'Completed')
  clients?: Client | null; // Joined client data
  quotation_rooms?: Array<QuotationRoom & { rooms?: (Room & { products?: Product[] }) }> | null; // Nested rooms and products
}

// Interface for the 'workers' table
export interface Worker {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  user_id: string; // uuid (references auth.users.id)
  name: string; // text
  email: string; // text
}

// Interface for the 'rooms' table
export interface Room {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  client_id: string | null; // uuid, nullable (references clients.id)
  room_name: string | null; // text, nullable
  room_type: string | null; // text, nullable
  description: string | null; // text, nullable
  status: string | null; // text, nullable (default 'Not Active')
  ref_image_urls: string[] | null; // text[], nullable
  total_sq_ft: string | null; // text, nullable
  is_in_closed_quotation?: boolean; // Added to indicate if the room is part of a closed quotation
}

export const ROOM_STATUS_TYPES = {
  ACTIVE: 'Active',
  IN_QUOTATION: 'In Quotation',
  READY_TO_START: 'Ready to Start',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
} as const;

export type RoomStatus = typeof ROOM_STATUS_TYPES[keyof typeof ROOM_STATUS_TYPES];

export const QUOTATION_STATUS_TYPES = {
  PENDING: 'Pending',
  ACTIVE: 'Active', // Added Active status
  CLOSED: 'Closed',
} as const;

export type QuotationStatus = typeof QUOTATION_STATUS_TYPES[keyof typeof QUOTATION_STATUS_TYPES];

export const LEAD_STATUS_TYPES = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
} as const;

export type LeadStatus = typeof LEAD_STATUS_TYPES[keyof typeof LEAD_STATUS_TYPES];

export interface Lead {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  user_id: string; // uuid (references auth.users.id)
  name: string; // text
  contact: string | null; // text, nullable
  address: string | null; // text, nullable
  comment: string | null; // text, nullable
  status: LeadStatus; // 'Approved' | 'Rejected' | 'Pending'
}

// Interface for the 'raw_materials' table
export interface RawMaterial {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  name: string; // text
  category: string; // text
  subcategories: string[] | null; // text[], nullable
  quantity: number; // numeric
  unit_type: string; // text
}

// Interface for the 'vendors' table
export interface Vendor {
  id: string; // uuid, primary key
  name: string; // text
  contact: string | null; // text (phone/email), nullable
  address: string | null; // text, nullable
  created_at: string; // timestamp with time zone
}

// Interface for the 'purchased_orders' table
export interface PurchasedOrder {
  id: string; // uuid, primary key
  vendor_id: string; // uuid (foreign key to vendors.id)
  raw_materials: Array<{ name: string; quantity: number; unit_type: string; order_quantity: number; order_unit_type: string }> | null; // JSONB, array of objects
  created_at: string; // timestamp with time zone
}

export interface ProductType {
  name: string;
  default_price: number;
  default_unit_type?: string | null; // Added for selected unit type
  units?: string[]; // Array of available unit types for this product
  wages: number;
  sub_products?: ProductType[];
}

export interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  location: string;
}

// Interface for the 'room_types' table
export interface RoomType {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  name: string; // text
  slug: string; // text, unique
  products: ProductType[]; // jsonb
}
