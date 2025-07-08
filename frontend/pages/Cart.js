function CartPage({ cart, formatCurrency }) {
  return (
    <div>
      <h2>Your Cart</h2>
      <CartItemsList cart={cart} formatCurrency={formatCurrency} />
      <DiscountCode />
      <CheckoutCTA />
    </div>
  );
}
