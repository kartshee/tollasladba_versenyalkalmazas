import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { AppLink } from '../components/AppLink.jsx';

export function StandingsPage({ params }) {
  const { id, categoryId } = params;
  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}/categories/${categoryId}`}>Vissza a kategóriához</BackLink>
      <PageHeader eyebrow="Standings" title="Csoportállás" description="A standings oldal részletes backend bekötése a következő körben jön. A route és a layout már készen áll." />
      <SectionCard title="Tervezett tartalom" subtitle="Ez a nézet fogja megjeleníteni a helyezéseket, a tie-break információkat és a shared place jelzéseket.">
        <ul className="bullet-list">
          <li>helyezés és játékosnév</li>
          <li>win rate / győzelmek</li>
          <li>szettkülönbség és pontkülönbség</li>
          <li>tieResolved és unresolved tie jelzések</li>
          <li>manual override állapot megjelenítése, ha szükséges</li>
        </ul>
        <AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${categoryId}`}>Vissza a kategória műveletekhez</AppLink>
      </SectionCard>
    </div>
  );
}
