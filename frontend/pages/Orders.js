function OrdersPage({ orders, formatCurrency }) {
  return (
    <div>
      <h2>Order History</h2>
      <ul className="list-group">
        {orders.map(o => (
          <li key={o.id} className="list-group-item d-flex justify-content-between">
            <span>{o.date}</span>
            <span>{formatCurrency(o.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
