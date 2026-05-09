import { AppLink } from '../components/AppLink.jsx';
import { SectionCard } from '../components/SectionCard.jsx';

export function NotFoundPage() {
  return (
    <SectionCard title="Az oldal nem található" subtitle="A megadott útvonalhoz jelenleg nincs frontend nézet.">
      <AppLink className="button button--primary" to="/">Vissza a főoldalra</AppLink>
    </SectionCard>
  );
}
