export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  // Categoria pai, para suportar hierarquia (ex: Acessórios > Pulseiras >
  // Correntes). Nulo = categoria de nível topo.
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

// Categoria "achatada" (como vem do banco) com metadados de profundidade
// calculados no client, usada para montar árvores/selects indentados.
export type CategoryWithDepth = Category & { depth: number };

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock: number;
  weight_grams: number;
  height_cm: number;
  width_cm: number;
  length_cm: number;
  images: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
};

export type Coupon = {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_value: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type PaymentStatus = 'pending' | 'paid' | 'rejected' | 'refunded' | 'cancelled';
export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type ShippingAddress = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type Order = {
  id: string;
  order_number: string;
  // Nulos até o webhook do Mercado Pago preencher (fluxo de "compra
  // rápida" pela sacola lateral, que pula o formulário de checkout).
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_document: string | null;
  shipping_address: ShippingAddress | null;
  shipping_cost: number;
  shipping_method: string | null;
  subtotal: number;
  discount: number;
  total: number;
  coupon_id: string | null;
  coupon_code: string | null;
  // Preenchido pelo webhook com o payment_type_id retornado pelo Mercado
  // Pago (ex: 'credit_card', 'debit_card', 'pix', 'ticket', 'bank_transfer'),
  // já que o método real só é conhecido depois que o cliente escolhe dentro
  // do Checkout Pro.
  payment_method: string | null;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  mercadopago_payment_id: string | null;
  mercadopago_preference_id: string | null;
  mercadopago_status_detail: string | null;
  // 'checkout_form': passou pela página /checkout com frete calculado.
  // 'quick_buy': veio direto da sacola lateral, sem frete/endereço prévios.
  order_source: 'checkout_form' | 'quick_buy';
  tracking_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  total: number;
};

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
};

export type ShippingOption = {
  method: string;
  label: string;
  price: number;
  deadlineDays: number;
};
