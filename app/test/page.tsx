import { getSpeciesData } from '@/lib/engine/data';
import SpeciesPreparing from '@/components/domain/SpeciesPreparing';
import type { Species } from '@/lib/engine/types';
import TestFlow from './TestFlow';

// 猫册是默认物种；狗册内容就绪前返回明确的「准备中」状态页
export default function TestPage({ searchParams }: { searchParams: { species?: string } }) {
  const species: Species = searchParams.species === 'dog' ? 'dog' : 'cat';
  if (!getSpeciesData(species)) return <SpeciesPreparing species={species} />;
  return <TestFlow species={species} />;
}
