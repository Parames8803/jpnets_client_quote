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
  client_id: string | null; // uuid, nullable (references clients.id)
  total_price: number | null; // numeric, nullable
  pdf_url: string | null; // text, nullable
  excel_url: string | null; // text, nullable
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

export interface ProductType {
  name: string;
  default_price: number;
  units?: string[];
  wages: number;
  sub_products?: ProductType[];
}

export const ROOM_TYPES: { name: string; slug: string; products: ProductType[] }[] = [
  {
    name: 'Living Room',
    slug: 'living-room',
    products: [
      { name: 'Sofa', default_price: 500, units: ['pcs', 'm'], wages: 50 },
      { name: 'Coffee Table', default_price: 150, units: ['pcs'], wages: 20 },
      { name: 'TV Stand', default_price: 200, units: ['pcs'], wages: 25 },
    ],
  },
  {
    name: 'Kitchen',
    slug: 'kitchen',
    products: [
      { name: 'Counter Top Bottom', default_price: 100, units: ['sq.ft', 'm²'], wages: 15,sub_products: [
          {
            name: 'Front Door',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 50, wages: 10 },
              { name: 'Double Sheet', default_price: 75, wages: 15 },
            ],
          },
          {
            name: 'Inner Shelve',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 25, wages: 5 },
              { name: 'Double Sheet', default_price: 25, wages: 5 },
            ],
          },
     ] },
      { name: 'Cabinets', default_price: 300, units: ['sq.ft', 'm²'], wages: 40 },
      { name: 'Sink', default_price: 120, units: ['pcs'], wages: 30 },
    ],
  },
  {
    name: 'Bedroom',
    slug: 'bedroom',
    products: [
      { name: 'Bed Frame', default_price: 400, units: ['pcs'], wages: 60 },
      {
        name: 'Wardrobe',
        default_price: 350,
        units: ['sq.ft', 'm²', 'pcs'],
        wages: 70,
        sub_products: [
          {
            name: 'Front Door',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 50, wages: 10 },
              { name: 'Double Sheet', default_price: 75, wages: 15 },
            ],
          },
          {
            name: 'Inner Shelve',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 25, wages: 5 },
              { name: 'Double Sheet', default_price: 25, wages: 5 },
            ],
          },
          { name: 'Back Side Sheet', default_price: 25, wages: 5 },
          { name: 'Aluminium Drawer', default_price: 25, wages: 5 },
          { name: 'Saint Gobain Mirror', default_price: 25, wages: 5 },
        ],
      },
      { name: 'Dresser', default_price: 250, units: ['pcs'], wages: 35 },
    ],
  },
];
