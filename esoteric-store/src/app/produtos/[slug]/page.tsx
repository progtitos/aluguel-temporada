import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductGallery } from '@/components/product/ProductGallery';
import { AddToCartPanel } from '@/components/product/AddToCartPanel';
import { ShippingCalculator } from '@/components/product/ShippingCalculator';
import { ProductSection } from '@/components/home/ProductSection';
import { formatCurrency } from '@/lib/utils';
import type { Metadata } from 'next';
import type { Product } from '@/types';

export const revalidate = 60;

async function getProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  return data as Product | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.short_description ?? product.description ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const supabase = await createClient();
  const { data: related } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(4);

  return (
    <div className="container-store py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          {product.categories?.name && (
            <span className="eyebrow">{product.categories.name}</span>
          )}
          <h1 className="mt-1 font-display text-3xl font-medium text-ink-700">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-ink-700">
              {formatCurrency(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-sm text-ink-300 line-through">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-ink-300">
            {product.stock > 0 ? `${product.stock} unidades em estoque` : 'Sem estoque no momento'}
          </p>

          {product.short_description && (
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              {product.short_description}
            </p>
          )}

          <div className="mt-6">
            <AddToCartPanel product={product} />
          </div>

          <div className="mt-6">
            <ShippingCalculator product={product} />
          </div>

          {product.description && (
            <div className="mt-8 border-t border-ink/10 pt-6">
              <h2 className="mb-2 text-sm font-semibold text-ink-700">Sobre o produto</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-500">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {!!related?.length && (
        <div className="mt-10">
          <ProductSection title="Você também pode gostar" products={related as Product[]} />
        </div>
      )}
    </div>
  );
}
