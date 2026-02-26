import './CardPanel.css';

export function CardPanel({ title, children }) {
  return (
    <section className="card-panel">
      <h3>{title}</h3>
      <div className="card-panel-content">{children}</div>
    </section>
  );
}
