function CheckoutPage({ cart, formatCurrency }) {
  return (
    <div>
      <h2>Checkout</h2>
      <div className="progress mb-3">
        <div className="progress-bar" style={{ width: '100%' }}>Step 3 of 3</div>
      </div>
      <ShippingInfo />
      <PaymentForm />
      <OrderSummary cart={cart} formatCurrency={formatCurrency} />
    </div>
  );
}
