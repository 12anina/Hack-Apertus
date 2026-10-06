/** Red accent bar on the top edge of a card. The parent needs `relative overflow-hidden`. */
export default function CardAccent() {
  return <div className="absolute top-0 left-0 h-1 w-1/2 bg-logo-red" aria-hidden="true" />;
}
