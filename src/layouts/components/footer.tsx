export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center shrink-0">
      <p className="text-sm text-slate-600">
        <span className="font-semibold">Manufacturera de Botas Cuadra</span> © {year}
      </p>
    </footer>
  );
}