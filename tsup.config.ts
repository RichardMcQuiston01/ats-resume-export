import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    zod: 'src/zod.ts',
    docx: 'src/docx.ts',
    pdf: 'src/pdf.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['docx', 'pdf-lib', 'zod'],
});
