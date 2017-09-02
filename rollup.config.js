import babel from 'rollup-plugin-babel';

export default {
  input: 'src/index.js',
  name: 'ReduxBatch',
  output: {
    file: 'lib/index.js',
    format: 'umd',
    exports: 'named',
  },
  plugins: [
    babel({
      babelrc: false,
      presets: [
        ['es2015', { modules: false }],
      ],
      plugins: [
        'transform-object-rest-spread',
      ],
    }),
  ],
};
