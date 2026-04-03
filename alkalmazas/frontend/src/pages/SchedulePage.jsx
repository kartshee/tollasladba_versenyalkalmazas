import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';

export function SchedulePage({ params }) {
  const { id } = params;
  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader eyebrow="Ütemezés" title="Globális scheduler" description="A scheduler külön admin oldalt kap, mert operatív szempontból ez az egyik legfontosabb nézet." />
      <SectionCard title="Tervezett tartalom">
        <ul className="bullet-list">
          <li>globális scheduler futtatása</li>
          <li>időrendi és pályák szerinti bontás</li>
          <li>kategória szűrés</li>
          <li>futó és betervezett meccsek áttekintése</li>
        </ul>
      </SectionCard>
    </div>
  );
}
