function WishlistPage({ favorites, formatCurrency }) {
  return (
    <div>
      <h2>Wishlist</h2>
      <ProductGrid products={favorites} formatCurrency={formatCurrency} />
    </div>
  );
}
