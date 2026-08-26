import { createClient } from '@/lib/supabase/server';
import { getBestSellers, getPromotions } from '@/lib/products';
import { Hero } from '@/components/home/Hero';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { ProductSection } from '@/components/home/ProductSection';
import { ProductCard } from '@/components/product/ProductCard';
import type { Category, Product } from '@/types';

export const revalidate = 60;

// Quantidade de produtos exibidos de cara na seção "Todos os Produtos" da home.
// O catálogo completo continua disponível em /produtos.
const ALL_PRODUCTS_HOME_LIMIT = 24;

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { data: categories },
    { data: featured },
    { data: allProducts },
    bestSellers,
    promotions,
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select('*, categories(*)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('*, categories(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(ALL_PRODUCTS_HOME_LIMIT),
    getBestSellers(supabase, 8),
    getPromotions(supabase, 8),
  ]);

  const featuredProducts = (featured as Product[]) ?? [];
  const catalogProducts = (allProducts as Product[]) ?? [];

  // Enquanto a loja não tem vendas registradas, usamos os produtos em
  // destaque como um substituto razoável para "Mais Vendidos", em vez de
  // deixar a seção vazia logo na primeira semana da loja no ar.
  const bestSellersToShow = bestSellers.length > 0 ? bestSellers : featuredProducts.slice(0, 8);

  return (
    <>
      <Hero />

      <CategoryGrid categories={(categories as Category[]) ?? []} />

      <ProductSection
        title="Mais Vendidos"
        subtitle="Os favoritos de quem já faz parte do Universo Encantado"
        products={bestSellersToShow}
        badge="bestseller"
        viewAllHref="/produtos?ordenar=recentes"
        dark
      />

      <ProductSection
        title="Promoções"
        subtitle="Aproveite descontos por tempo limitado"
        products={promotions}
        badge="promo"
        viewAllHref="/produtos"
      />

      <ProductSection
        title="Destaques"
        subtitle="Seleção especial da nossa curadoria"
        products={featuredProducts}
        viewAllHref="/produtos"
      />

      {/* Catálogo completo, exibido já na página inicial */}
      <section className="py-16">
        <div className="container-store">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-medium text-ink-700 sm:text-3xl">
                Todos os Produtos
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Explore o catálogo completo do Universo Encantado
              </p>
            </div>
            <a
              href="/produtos"
              className="flex items-center gap-1 text-sm font-medium text-dourado-700 hover:text-dourado-900"
            >
              Ver catálogo completo
            </a>
          </div>

          {catalogProducts.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-300">
              Em breve novos produtos por aqui.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {catalogProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
