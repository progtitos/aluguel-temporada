-- =========================================================
-- SEED: 3 acomodações de exemplo — edite pelo painel /admin depois
-- Rode DEPOIS de 01, 02, 03 e 05.
-- =========================================================

insert into properties (
  slug, name, short_description, description, house_rules, address_approx,
  address_full, latitude, longitude, preco_semana, preco_fds, cleaning_fee,
  checkin_time, checkout_time, max_guests, photos, is_active
)
values
(
  'casa-da-praia',
  'Casa da Praia',
  'Frente ao mar, 3 quartos, piscina privativa',
  'Casa espaçosa a 50 metros da praia, com piscina privativa, churrasqueira e vista para o mar. Ideal para famílias e grupos de amigos.',
  'Não é permitido fumar dentro do imóvel. Animais de estimação mediante consulta prévia.',
  'Praia Grande, SP',
  'Av. Beira Mar, 1200 - Boqueirão, Praia Grande - SP, 11700-000',
  -24.0058,
  -46.4022,
  550.00,
  650.00,
  150.00,
  '15:00',
  '11:00',
  8,
  '{}',
  true
),
(
  'chale-da-montanha',
  'Chalé da Montanha',
  'Lareira, vista panorâmica e clima de serra',
  'Chalé aconchegante em meio à natureza, com lareira, deck com hidromassagem e vista panorâmica das montanhas.',
  'Silêncio após às 22h. Proibido animais.',
  'Campos do Jordão, SP',
  'Rua das Hortênsias, 340 - Vila Capivari, Campos do Jordão - SP, 12460-000',
  -22.7392,
  -45.5913,
  420.00,
  480.00,
  100.00,
  '14:00',
  '12:00',
  4,
  '{}',
  true
),
(
  'loft-centro',
  'Loft no Centro',
  'Moderno, próximo a tudo, ideal para casais',
  'Loft moderno e totalmente equipado no coração da cidade, a poucos passos de restaurantes, bares e transporte público.',
  'Ambiente não fumante.',
  'São Paulo, SP',
  'Rua Augusta, 2200, apto 91 - Jardins, São Paulo - SP, 01412-100',
  -23.5613,
  -46.6560,
  280.00,
  320.00,
  80.00,
  '16:00',
  '11:00',
  2,
  '{}',
  true
);

-- Exemplo de regra de feriado prolongado (Ano Novo) para a Casa da Praia
insert into pricing_rules (property_id, name, start_date, end_date, price_per_night, min_nights)
select id, 'Ano Novo', '2026-12-28', '2027-01-02', 950.00, 5
from properties where slug = 'casa-da-praia';
