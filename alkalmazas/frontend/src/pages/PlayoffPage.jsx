import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';

export function PlayoffPage({ params }) {
  const { id, categoryId } = params;
  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}/categories/${categoryId}`}>Vissza a kategóriához</BackLink>
      <PageHeader eyebrow="Playoff" title="Playoff és bronzmeccs" description="A vizuális bracket oldal itt fog helyet kapni, beleértve a döntőt és a kötelező bronzmeccset is." />
      <SectionCard title="Tervezett tartalom">
        <ul className="bullet-list">
          <li>egyenes kieséses bracket nézet</li>
          <li>elődöntő, döntő és bronzmeccs</li>
          <li>playoff-only kategóriák támogatása</li>
          <li>meccsre kattintva eredményrögzítés</li>
        </ul>
      </SectionCard>
    </div>
  );
}
