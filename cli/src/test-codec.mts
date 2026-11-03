import { encodeVector, decodeVector } from '../../lib/engine/codec.ts';

const v1 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] as const;
const v2 = [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2] as const;
const v3 = [0,1,2,0,1,2,0,1,2,0,1,2,0,1,2] as const;
const v4 = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] as const;

for (const [name, v] of [['全L', v1], ['全H', v2], ['交错', v3], ['全M', v4]] as const) {
  const code = encodeVector([...v] as any);
  const back = decodeVector(code);
  const ok = JSON.stringify(back) === JSON.stringify(v);
  console.log(name, '→', code, '→', ok ? 'OK' : 'FAIL', ok ? '' : JSON.stringify(back));
}
