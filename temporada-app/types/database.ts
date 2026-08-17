export type BookingStatus = "pendente" | "confirmada" | "cancelada" | "bloqueio";

// IMPORTANTE: usamos `type` (não `interface`) porque o supabase-js precisa
// que estes tipos sejam estruturalmente compatíveis com Record<string, unknown>.
// Interfaces não recebem index signature implícita e quebram a inferência
// de tipos (Row/Insert/Update acabam virando `never`).
export type Property = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  house_rules: string | null;
  address_approx: string | null;
  latitude: number | null;
  longitude: number | null;
  price_per_night: number;
  cleaning_fee: number;
  max_guests: number;
  photos: string[];
  is_active: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  property_id: string;
  guest_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: BookingStatus;
  created_at: string;
};

export type Payment = {
  id: string;
  booking_id: string;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  method: string | null;
  status: string;
  amount: number;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: Property;
        Insert: Partial<Property>;
        Update: Partial<Property>;
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: Partial<Booking>;
        Update: Partial<Booking>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
        Relationships: [];
      };
    };
    Views: {
      public_availability: {
        Row: {
          property_id: string;
          check_in: string;
          check_out: string;
          status: BookingStatus;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
