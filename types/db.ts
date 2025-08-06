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
  client_id: string | null; // uuid, nullable (references clients.id)
  total_price: number | null; // numeric, nullable
  pdf_url: string | null; // text, nullable
  excel_url: string | null; // text, nullable
}

// Interface for the 'rooms' table
export interface Room {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  client_id: string | null; // uuid, nullable (references clients.id)
  room_type: string | null; // text, nullable
  description: string | null; // text, nullable
  status: string | null; // text, nullable (default 'Not Active')
  ref_image_urls: string[] | null; // text[], nullable
  total_sq_ft: string | null; // text, nullable
}
