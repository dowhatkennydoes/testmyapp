function HomePage({ products, formatCurrency }) {
  return (
    <div>
      <HeroBanner />
      <FeaturedProducts products={products.slice(0, 3)} formatCurrency={formatCurrency} />
      <PromoSection />
      <FooterComp />
    </div>
  );
}
