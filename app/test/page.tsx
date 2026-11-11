import type { Species } from '@/lib/engine/types';
import TestFlow from './TestFlow';

export default function TestPage({ searchParams }: { searchParams: { species?: string } }) {
  const species: Species = searchParams.species === 'dog' ? 'dog' : 'cat';
  return <TestFlow species={species} />;
}
