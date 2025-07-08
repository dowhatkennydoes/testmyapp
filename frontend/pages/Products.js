function ProductsPage({ products, page, setPage, total, perPage, filter, setFilter, categories, category, setCategory, formatCurrency }) {
  const filtered = products.filter(p => {
    const matchesName = p.name.toLowerCase().includes(filter.toLowerCase());
    const matchesCat = !category || p.category === category;
    return matchesName && matchesCat;
  });
  return (
    <div>
      <h2>Products</h2>
      <ProductFilters filter={filter} setFilter={setFilter} categories={categories} category={category} setCategory={setCategory} />
      <ProductGrid products={filtered} formatCurrency={formatCurrency} />
      <Pagination page={page} setPage={setPage} total={total} perPage={perPage} />
    </div>
  );
}
