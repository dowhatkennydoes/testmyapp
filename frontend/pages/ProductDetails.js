function ProductDetails({ products, addToCart, addToFav, formatCurrency }) {
  const { id } = useParams();
  const product = products.find(p => p.id === parseInt(id));
  if (!product) return <NotFound />;
  return (
    <div>
      <h2>{product.name}</h2>
      <ProductImages src={product.image} />
      <Rating value={product.rating || 0} />
      <p>{formatCurrency(product.price)}</p>
      <AddToCartButton onAdd={() => addToCart(product)} />
      <button className="btn btn-outline-primary ms-2" onClick={() => addToFav(product)}>Wishlist</button>
      <ProductSpecs />
      <RelatedProducts />
    </div>
  );
}
