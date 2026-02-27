import './CardPanel.css';

export function CardPanel({ title, children }) {
  return (
    <section className="card-panel">
      {title ? <h3>{title}</h3> : null}
      <div className="card-panel-content">{children}</div>
    </section>
  );
}
