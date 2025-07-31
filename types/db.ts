// Interface for the 'clients' table
export interface Client {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  user_id: string; // uuid (references auth.users.id)
  name: string; // text
  contact_number: string | null; // text, nullable
  email: string | null; // text, nullable
  address: string | null; // text, nullable
}

// Interface for the 'measurements' table
export interface Measurement {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  room_id: string | null; // uuid, nullable (references rooms.id)
  unit_type: string | null; // text, nullable
  value: number | null; // numeric, nullable
  label: string | null; // text, nullable
  converted_sq_ft: number | null; // numeric, nullable
}

// Interface for the 'products' table
export interface Product {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  room_id: string | null; // uuid, nullable (references rooms.id)
  name: string | null; // text, nullable
  quantity: number | null; // numeric, nullable
  unit_type: string | null; // text, nullable
}

// Interface for the 'quotation_rooms' table (junction table)
export interface QuotationRoom {
  created_at: string; // timestamp with time zone
  quotation_id: string; // uuid (references quotations.id)
  room_id: string; // uuid (references rooms.id)
  price_per_sq_ft: number | null; // numeric, nullable
  room_total_price: number | null; // numeric, nullable
}

// Interface for the 'quotations' table
export interface Quotation {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  client_id: string | null; // uuid, nullable (references clients.id)
  assigned_employee_phone: string | null; // text, nullable
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
}
