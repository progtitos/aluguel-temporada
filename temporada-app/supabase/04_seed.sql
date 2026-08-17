-- =========================================================
-- SEED: 3 acomodações de exemplo — edite pelo painel /admin depois
-- =========================================================

insert into properties (slug, name, short_description, description, house_rules, address_approx, latitude, longitude, price_per_night, cleaning_fee, max_guests, photos, is_active)
values
(
  'casa-da-praia',
  'Casa da Praia',
  'Frente ao mar, 3 quartos, piscina privativa',
  'Casa espaçosa a 50 metros da praia, com piscina privativa, churrasqueira e vista para o mar. Ideal para famílias e grupos de amigos.',
  'Check-in a partir das 15h. Check-out até 11h. Não é permitido fumar dentro do imóvel. Animais de estimação mediante consulta prévia.',
  'Praia Grande, SP',
  -24.0058,
  -46.4022,
  650.00,
  150.00,
  8,
  '{}',
  true
),
(
  'chale-da-montanha',
  'Chalé da Montanha',
  'Lareira, vista panorâmica e clima de serra',
  'Chalé aconchegante em meio à natureza, com lareira, deck com hidromassagem e vista panorâmica das montanhas.',
  'Check-in a partir das 14h. Check-out até 12h. Silêncio após às 22h. Proibido animais.',
  'Campos do Jordão, SP',
  -22.7392,
  -45.5913,
  480.00,
  100.00,
  4,
  '{}',
  true
),
(
  'loft-centro',
  'Loft no Centro',
  'Moderno, próximo a tudo, ideal para casais',
  'Loft moderno e totalmente equipado no coração da cidade, a poucos passos de restaurantes, bares e transporte público.',
  'Check-in a partir das 16h. Check-out até 11h. Ambiente não fumante.',
  'São Paulo, SP',
  -23.5613,
  -46.6560,
  320.00,
  80.00,
  2,
  '{}',
  true
);
